import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import email_utils
from auth_utils import hash_password
from models import SUBSCRIPTION_PLANS, ORG_STATUS_PENDING_PAYMENT, ORG_STATUS_WAITING_APPROVAL

router = APIRouter()


@router.post("/register-company", response_model=schemas.CompanyRegisterOut, status_code=201)
def register_company(payload: schemas.CompanyRegister, db: Session = Depends(get_db)):
    """BRD Section 2/3: public "Add Company" registration form + workflow
    Step 1 (validate) / Step 2 (create pending_payment record) / Step 3
    (send registration email)."""

    # Step 1: validation
    dup_company = db.query(models.Organization).filter(models.Organization.name == payload.company_name).first()
    if dup_company:
        raise HTTPException(status_code=409, detail="A company with this name is already registered")

    dup_email = db.query(models.Organization).filter(models.Organization.admin_email == payload.email).first()
    if dup_email:
        raise HTTPException(status_code=409, detail="This email is already registered")

    dup_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if dup_user:
        raise HTTPException(status_code=409, detail="This email is already registered")

    plan = SUBSCRIPTION_PLANS[payload.subscription_plan]

    # Step 2: create the company record with status = Pending Payment
    org = models.Organization(
        name=payload.company_name,
        plan="professional",
        max_team_members=plan["max_team_members"],
        country=payload.country,
        state=payload.state,
        city=payload.city,
        registration_number=payload.registration_number,
        admin_name=payload.administrator_name,
        admin_email=payload.email,
        mobile_number=payload.mobile_number,
        landline_number=payload.landline_number,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        postal_code=payload.postal_code,
        subscription_plan_code=payload.subscription_plan,
        subscription_amount=plan["amount"],
        payment_status="unpaid",
        registration_status=ORG_STATUS_PENDING_PAYMENT,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Step 3: send registration confirmation email with payment link
    email_utils.registration_confirmation_email(db, org)

    return schemas.CompanyRegisterOut(
        organization_id=org.id,
        registration_id=org.id,
        company_name=org.name,
        subscription_plan=plan["label"],
        amount=float(plan["amount"]),
        payment_status=org.payment_status,
        registration_status=org.registration_status,
        payment_link=f"/payment/{org.id}",
    )


@router.get("/register-company/{organization_id}")
def get_registration_status(organization_id: int, db: Session = Depends(get_db)):
    """Used by the payment page to show company/plan/amount before paying."""
    org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Registration not found")
    plan = SUBSCRIPTION_PLANS.get(org.subscription_plan_code, {})
    return {
        "organization_id": org.id,
        "company_name": org.name,
        "admin_email": org.admin_email,
        "subscription_plan": plan.get("label"),
        "amount": float(org.subscription_amount) if org.subscription_amount is not None else None,
        "payment_status": org.payment_status,
        "registration_status": org.registration_status,
    }


@router.post("/register-company/{organization_id}/pay")
def pay_for_registration(organization_id: int, payload: schemas.PayRequest, db: Session = Depends(get_db)):
    """BRD Section 4: Test Payment Gateway (Stripe Test / Razorpay Test /
    PayPal Sandbox). This simulates a successful test-mode payment
    callback -- swap the body for a real gateway webhook handler later,
    with secure payment callback validation (BRD Section 12)."""
    org = db.query(models.Organization).filter(models.Organization.id == organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Registration not found")
    if org.payment_status == "paid":
        raise HTTPException(status_code=400, detail="This registration has already been paid")

    payment = models.Payment(
        organization_id=org.id,
        amount=org.subscription_amount,
        gateway=payload.gateway,
        status="success",
        reference=f"TEST-{org.id}-{int(datetime.utcnow().timestamp())}",
        paid_at=datetime.utcnow(),
    )
    db.add(payment)

    # After successful payment: Payment Status -> Paid, Organization Status -> Waiting for Approval
    org.payment_status = "paid"
    org.registration_status = ORG_STATUS_WAITING_APPROVAL
    db.commit()
    db.refresh(org)
    db.refresh(payment)

    # Create (or update) the Company Admin's login account now, so the
    # credentials can be emailed immediately. Login itself stays blocked
    # until ABI-TECH admin approves the org (see auth.py _check_org_access).
    temp_password = secrets.token_urlsafe(6)
    user = db.query(models.User).filter(models.User.email == org.admin_email).first()
    if user:
        user.password_hash = hash_password(temp_password)
        user.must_reset_password = True
        user.is_temp_password = True
    else:
        user = models.User(
            name=org.admin_name or org.name,
            email=org.admin_email,
            password_hash=hash_password(temp_password),
            must_reset_password=True,
            is_temp_password=True,
        )
        db.add(user)
    db.commit()
    db.refresh(user)

    membership = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.user_id == user.id)
        .first()
    )
    if not membership:
        db.add(models.OrganizationMembership(
            organization_id=org.id, user_id=user.id, role="super_admin", status="active"
        ))
        db.commit()

    # Email the Company Admin: payment successful + payment details + login credentials.
    email_utils.payment_successful_email(
        db, org, payment=payment, username=user.email, temp_password=temp_password,
    )

    return {
        "message": "Payment successful. Your registration is now waiting for admin approval.",
        "payment_status": org.payment_status,
        "registration_status": org.registration_status,
    }
