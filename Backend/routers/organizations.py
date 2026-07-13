from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth_utils import hash_password
from deps import get_current_user, get_current_membership, require_super_admin

router = APIRouter()


def _seat_info(org: models.Organization, db: Session):
    used = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.organization_id == org.id)
        .count()
    )
    limit = org.max_team_members
    available = None if limit is None else max(limit + 1 - used, 0)  # +1 for the Super Admin seat
    return used, available


@router.get("/me", response_model=schemas.OrganizationOut)
def get_my_organization(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_current_membership(db, current_user)
    return membership.organization


@router.get("/members", response_model=List[schemas.MemberOut])
def list_members(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_current_membership(db, current_user)
    rows = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.organization_id == membership.organization_id)
        .order_by(models.OrganizationMembership.created_at.asc())
        .all()
    )
    return [
        schemas.MemberOut(
            membership_id=m.id,
            user_id=m.user_id,
            name=m.user.name,
            email=m.user.email,
            role=m.role,
            status=m.status,
            created_at=m.created_at,
        )
        for m in rows
    ]


@router.post("/members", response_model=schemas.MemberOut, status_code=201)
def add_member(
    payload: schemas.MemberInvite,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Super Admin adds a Team Member directly with a temp password
    (FR-002). Enforces the seat limit for the org's plan."""
    admin_membership = require_super_admin(db, current_user)
    org = admin_membership.organization

    used, available = _seat_info(org, db)
    if available is not None and available <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Seat limit reached for the {org.plan} plan ({org.max_team_members} team members). "
                   f"Upgrade the subscription to invite more members.",
        )

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        already_member = (
            db.query(models.OrganizationMembership)
            .filter(models.OrganizationMembership.user_id == existing.id)
            .first()
        )
        if already_member:
            raise HTTPException(status_code=409, detail="This user is already part of an organization")
        user = existing
    else:
        user = models.User(
            name=payload.name,
            email=payload.email,
            password_hash=hash_password(payload.temp_password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    membership = models.OrganizationMembership(
        organization_id=org.id,
        user_id=user.id,
        role="team_member",
        status="active",
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)

    return schemas.MemberOut(
        membership_id=membership.id,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=membership.role,
        status=membership.status,
        created_at=membership.created_at,
    )


@router.patch("/members/{membership_id}", response_model=schemas.MemberOut)
def update_member_status(
    membership_id: int,
    payload: schemas.MemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Enable/disable a member (FR: Disable Member)."""
    admin_membership = require_super_admin(db, current_user)
    member = (
        db.query(models.OrganizationMembership)
        .filter(
            models.OrganizationMembership.id == membership_id,
            models.OrganizationMembership.organization_id == admin_membership.organization_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot change the Super Admin's status")

    if payload.status:
        member.status = payload.status
    db.commit()
    db.refresh(member)

    return schemas.MemberOut(
        membership_id=member.id,
        user_id=member.user.id,
        name=member.user.name,
        email=member.user.email,
        role=member.role,
        status=member.status,
        created_at=member.created_at,
    )


@router.post("/members/{membership_id}/reset-password")
def reset_member_password(
    membership_id: int,
    payload: schemas.ResetMemberPassword,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    admin_membership = require_super_admin(db, current_user)
    member = (
        db.query(models.OrganizationMembership)
        .filter(
            models.OrganizationMembership.id == membership_id,
            models.OrganizationMembership.organization_id == admin_membership.organization_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully"}


@router.delete("/members/{membership_id}", status_code=204)
def remove_member(
    membership_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    admin_membership = require_super_admin(db, current_user)
    member = (
        db.query(models.OrganizationMembership)
        .filter(
            models.OrganizationMembership.id == membership_id,
            models.OrganizationMembership.organization_id == admin_membership.organization_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "super_admin":
        raise HTTPException(status_code=400, detail="Cannot remove the Super Admin")

    db.delete(member)
    db.commit()
    return None


@router.post("/projects/{project_id}/assign", response_model=List[int])
def assign_project(
    project_id: int,
    payload: schemas.ProjectAssignRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Super Admin assigns/reassigns which Team Members can access a
    project (Module 1: Project Access Control)."""
    admin_membership = require_super_admin(db, current_user)
    project = (
        db.query(models.Project)
        .filter(
            models.Project.id == project_id,
            models.Project.organization_id == admin_membership.organization_id,
        )
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Replace existing assignments with the new set.
    db.query(models.ProjectAssignment).filter(models.ProjectAssignment.project_id == project_id).delete()
    for uid in set(payload.user_ids):
        db.add(models.ProjectAssignment(project_id=project_id, user_id=uid))
    db.commit()

    return payload.user_ids


@router.get("/dashboard", response_model=schemas.OrgDashboardOut)
def org_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Organization Dashboard (Module 1): total projects, active users,
    available seats, plan, expiry, AI usage."""
    membership = get_current_membership(db, current_user)
    org = membership.organization

    total_projects = (
        db.query(models.Project).filter(models.Project.organization_id == org.id).count()
    )
    active_users = (
        db.query(models.OrganizationMembership)
        .filter(
            models.OrganizationMembership.organization_id == org.id,
            models.OrganizationMembership.status == "active",
        )
        .count()
    )
    used_seats, available_seats = _seat_info(org, db)

    org_project_ids = [
        p.id for p in db.query(models.Project.id).filter(models.Project.organization_id == org.id).all()
    ]

    def count_for(model):
        if not org_project_ids:
            return 0
        return db.query(model).filter(model.project_id.in_(org_project_ids)).count()

    ai_usage = (
        count_for(models.TestCaseHistory)
        + count_for(models.AutomationHistory)
        + count_for(models.BugReportHistory)
        + count_for(models.ScreenshotAnalysisHistory)
    )

    recent_projects = (
        db.query(models.Project)
        .filter(models.Project.organization_id == org.id)
        .order_by(models.Project.modified_at.desc())
        .limit(5)
        .all()
    )

    recent_activities = []
    if org_project_ids:
        tc_history = (
            db.query(models.TestCaseHistory)
            .filter(models.TestCaseHistory.project_id.in_(org_project_ids))
            .order_by(models.TestCaseHistory.created_at.desc())
            .limit(5)
            .all()
        )
        for h in tc_history:
            recent_activities.append({
                "type": "Test Cases Generated",
                "project_id": h.project_id,
                "created_at": h.created_at.isoformat(),
            })
        recent_activities.sort(key=lambda a: a["created_at"], reverse=True)
        recent_activities = recent_activities[:5]

    return schemas.OrgDashboardOut(
        organization=org,
        total_projects=total_projects,
        active_users=active_users,
        available_seats=available_seats,
        used_seats=used_seats,
        ai_usage=ai_usage,
        recent_projects=[
            {"id": p.id, "name": p.name, "modified_at": p.modified_at.isoformat()} for p in recent_projects
        ],
        recent_ai_activities=recent_activities,
    )
