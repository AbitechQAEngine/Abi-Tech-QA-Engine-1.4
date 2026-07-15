import secrets
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func as sql_func
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
import email_utils
from auth_utils import hash_password
from deps import require_platform_admin
from models import (
    SUBSCRIPTION_PLANS,
    ORG_STATUS_PENDING_PAYMENT,
    ORG_STATUS_WAITING_APPROVAL,
    ORG_STATUS_ACTIVE,
    ORG_STATUS_REJECTED,
    ORG_STATUS_SUSPENDED,
    ORG_STATUS_EXPIRED,
)

router = APIRouter()


def _audit(db: Session, org_id: int, actor: str, action: str, details: str = ""):
    db.add(models.AuditLog(organization_id=org_id, actor=actor, action=action, details=details))
    db.commit()


def _org_to_admin_out(org: models.Organization) -> schemas.OrganizationAdminOut:
    return schemas.OrganizationAdminOut(
        id=org.id,
        name=org.name,
        admin_name=org.admin_name,
        admin_email=org.admin_email,
        country=org.country,
        subscription_plan_code=org.subscription_plan_code,
        subscription_amount=float(org.subscription_amount) if org.subscription_amount is not None else None,
        payment_status=org.payment_status,
        registration_status=org.registration_status,
        registration_date=org.registration_date,
        subscription_expiry=org.subscription_expiry,
        rejection_reason=org.rejection_reason,
    )


def _platform_admin_emails(db: Session):
    """Emails of all platform-admin users -- their orgs (if any, e.g. from
    testing) should never appear in the customer-facing dashboard."""
    rows = db.query(models.User.email).filter(models.User.is_platform_admin == True).all()  # noqa: E712
    return {r[0] for r in rows}


@router.get("/stats", response_model=schemas.PlatformStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    admin_emails = _platform_admin_emails(db)
    q = db.query(models.Organization).filter(models.Organization.admin_email.notin_(admin_emails))
    total = q.count()
    pending = q.filter(models.Organization.registration_status == ORG_STATUS_WAITING_APPROVAL).count()
    active = q.filter(models.Organization.registration_status == ORG_STATUS_ACTIVE).count()
    expired = q.filter(models.Organization.registration_status == ORG_STATUS_EXPIRED).count()

    revenue = (
        db.query(sql_func.coalesce(sql_func.sum(models.Payment.amount), 0))
        .filter(models.Payment.status == "success")
        .scalar()
    )

    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_regs = q.filter(models.Organization.registration_date >= month_start).count()

    active_users = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.status == "active"
    ).count()
    total_projects = db.query(models.Project).count()

    return schemas.PlatformStats(
        total_registered=total,
        pending_approvals=pending,
        active_companies=active,
        expired_companies=expired,
        revenue_generated=float(revenue or 0),
        monthly_registrations=monthly_regs,
        active_users=active_users,
        total_projects=total_projects,
    )


@router.get("/organizations", response_model=List[schemas.OrganizationAdminOut])
def list_organizations(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    admin_emails = _platform_admin_emails(db)
    q = db.query(models.Organization).filter(models.Organization.admin_email.notin_(admin_emails))
    if status_filter:
        q = q.filter(models.Organization.registration_status == status_filter)
    orgs = q.order_by(models.Organization.registration_date.desc()).all()
    return [_org_to_admin_out(o) for o in orgs]


@router.get("/organizations/{org_id}", response_model=schemas.OrganizationAdminOut)
def get_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return _org_to_admin_out(org)


@router.post("/organizations/{org_id}/approve")
def approve_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    """BRD Section 5: generate the Company Login Account + temp password,
    hash with bcrypt, email the credentials, activate the subscription."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Cannot approve a company that hasn't completed payment")
    if org.registration_status == ORG_STATUS_ACTIVE:
        raise HTTPException(status_code=400, detail="This organization is already active")

    existing_user = db.query(models.User).filter(models.User.email == org.admin_email).first()
    temp_password = secrets.token_urlsafe(6)  # e.g. "X7-Lm92Q"-like string

    if existing_user:
        user = existing_user
        user.password_hash = hash_password(temp_password)  # bcrypt hashing (BRD Section 12)
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
        membership = models.OrganizationMembership(
            organization_id=org.id, user_id=user.id, role="super_admin", status="active"
        )
        db.add(membership)

    plan = SUBSCRIPTION_PLANS[org.subscription_plan_code]
    org.registration_status = ORG_STATUS_ACTIVE
    org.approved_at = datetime.utcnow()
    org.subscription_expiry = datetime.utcnow() + timedelta(days=plan["duration_days"])
    org.max_team_members = plan["max_team_members"]
    db.commit()

    email_utils.approval_email(db, org, username=user.email, temp_password=temp_password, login_url="/login")
    _audit(db, org.id, "ABI-TECH Super Admin", "approve", f"Approved and activated until {org.subscription_expiry}")

    return {"message": "Organization approved. Login credentials have been emailed.", "username": user.email}


@router.post("/organizations/{org_id}/reject")
def reject_organization(
    org_id: int,
    payload: schemas.RejectRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.registration_status = ORG_STATUS_REJECTED
    org.rejection_reason = payload.reason
    db.commit()

    email_utils.rejection_email(db, org, payload.reason)
    _audit(db, org.id, "ABI-TECH Super Admin", "reject", payload.reason)

    return {"message": "Organization rejected."}


@router.post("/organizations/{org_id}/suspend")
def suspend_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    org.registration_status = ORG_STATUS_SUSPENDED
    db.commit()
    _audit(db, org.id, "ABI-TECH Super Admin", "suspend")
    return {"message": "Organization suspended. Company login is now disabled."}


@router.post("/organizations/{org_id}/renew")
def renew_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    """Renews for the same plan duration from today's date (BRD Section 10)."""
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    plan = SUBSCRIPTION_PLANS.get(org.subscription_plan_code, SUBSCRIPTION_PLANS["1_year"])
    org.subscription_expiry = datetime.utcnow() + timedelta(days=plan["duration_days"])
    org.registration_status = ORG_STATUS_ACTIVE
    db.commit()
    _audit(db, org.id, "ABI-TECH Super Admin", "renew", f"New expiry {org.subscription_expiry}")
    return {"message": "Subscription renewed.", "subscription_expiry": org.subscription_expiry}


@router.delete("/organizations/{org_id}", status_code=204)
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_platform_admin),
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    _audit(db, org.id, "ABI-TECH Super Admin", "delete", f"Deleted organization '{org.name}'")
    db.delete(org)
    db.commit()
    return None


def sweep_expired_subscriptions(db: Session):
    """Utility for a scheduled job: flips active orgs past their expiry
    into 'expired' and disables company login (BRD Section 10/11)."""
    now = datetime.utcnow()
    expired_orgs = (
        db.query(models.Organization)
        .filter(
            models.Organization.registration_status == ORG_STATUS_ACTIVE,
            models.Organization.subscription_expiry.isnot(None),
            models.Organization.subscription_expiry < now,
        )
        .all()
    )
    for org in expired_orgs:
        org.registration_status = ORG_STATUS_EXPIRED
        email_utils.subscription_expired_email(db, org)
    if expired_orgs:
        db.commit()
    return len(expired_orgs)
