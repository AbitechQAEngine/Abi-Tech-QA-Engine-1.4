from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from auth_utils import decode_access_token
import models

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "user_id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_current_membership(
    db: Session,
    user: models.User,
) -> models.OrganizationMembership:
    """Every user belongs to exactly one Organization (Module 1)."""
    membership = (
        db.query(models.OrganizationMembership)
        .filter(models.OrganizationMembership.user_id == user.id)
        .first()
    )
    if not membership:
        raise HTTPException(status_code=404, detail="No organization found for this user")
    if membership.status == "disabled":
        raise HTTPException(status_code=403, detail="Your account has been disabled by your organization admin")
    return membership


def require_super_admin(
    db: Session,
    user: models.User,
) -> models.OrganizationMembership:
    membership = get_current_membership(db, user)
    if membership.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only the Super Admin can perform this action")
    return membership


def get_owned_project(
    project_id: int,
    db: Session,
    user: models.User,
) -> models.Project:
    """Fetch a project and verify the current user can access it: Super
    Admins can access every project in their organization; Team Members
    only projects explicitly assigned to them (Module 1: Project Access
    Control)."""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    membership = get_current_membership(db, user)

    if project.organization_id != membership.organization_id:
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    if membership.role == "super_admin":
        return project

    assigned = (
        db.query(models.ProjectAssignment)
        .filter(
            models.ProjectAssignment.project_id == project.id,
            models.ProjectAssignment.user_id == user.id,
        )
        .first()
    )
    if not assigned:
        raise HTTPException(status_code=403, detail="You do not have access to this project")
    return project
