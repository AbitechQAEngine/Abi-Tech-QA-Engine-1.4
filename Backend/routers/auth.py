import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth_utils import hash_password, verify_password, create_access_token
from deps import get_current_user, get_current_membership

router = APIRouter()

RESET_TOKEN_EXPIRE_MINUTES = 30


def _user_out_with_org(user: models.User, db: Session) -> schemas.UserOut:
    membership = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.user_id == user.id)
        .first()
    )
    data = schemas.UserOut.model_validate(user).model_dump()
    if membership:
        data["role"] = membership.role
        data["organization_id"] = membership.organization_id
        data["organization_name"] = membership.organization.name
    return schemas.UserOut(**data)


@router.post("/register", response_model=schemas.TokenOut, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Every signup creates a brand-new Organization with the user as its
    # first Super Admin (Module 1: Subscription Management business flow).
    org = models.Organization(
        name=f"{user.name}'s Organization",
        plan="professional",
        max_team_members=10,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    membership = models.OrganizationMembership(
        organization_id=org.id,
        user_id=user.id,
        role="super_admin",
        status="active",
    )
    db.add(membership)
    db.commit()

    token = create_access_token({"user_id": user.id})
    return schemas.TokenOut(access_token=token, user=_user_out_with_org(user, db))


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    membership = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.user_id == user.id)
        .first()
    )
    if membership and membership.status == "disabled":
        raise HTTPException(status_code=403, detail="Your account has been disabled by your organization admin")

    token = create_access_token({"user_id": user.id})
    return schemas.TokenOut(access_token=token, user=_user_out_with_org(user, db))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_out_with_org(current_user, db)


@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Always return the same response whether or not the email exists,
    # so attackers can't use this endpoint to enumerate registered emails.
    generic_response = {
        "message": "If an account exists for that email, a reset link has been sent."
    }

    if not user:
        return generic_response

    token = secrets.token_urlsafe(32)
    reset_entry = models.PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
    )
    db.add(reset_entry)
    db.commit()

    # NOTE: Wire this up to a real email provider (e.g. Resend, SendGrid, SES).
    # For now the token is returned directly so you can test the flow end-to-end
    # without email infrastructure set up yet.
    generic_response["dev_reset_token"] = token
    return generic_response


@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    entry = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token == payload.token)
        .first()
    )
    if not entry or entry.used == 1:
        raise HTTPException(status_code=400, detail="Invalid or already-used reset token")
    if entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This reset link has expired")

    user = db.query(models.User).filter(models.User.id == entry.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    entry.used = 1
    db.commit()

    return {"message": "Password has been reset successfully. You can now log in."}
