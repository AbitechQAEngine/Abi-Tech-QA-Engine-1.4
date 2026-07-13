from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from deps import get_current_user, get_owned_project, get_current_membership

router = APIRouter()


def _to_out(project: models.Project, db: Session) -> schemas.ProjectOut:
    assigned = [
        a.user_id
        for a in db.query(models.ProjectAssignment).filter(models.ProjectAssignment.project_id == project.id).all()
    ]
    data = schemas.ProjectOut.model_validate(project).model_dump()
    data["assigned_user_ids"] = assigned
    return schemas.ProjectOut(**data)


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_current_membership(db, current_user)
    if membership.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only the Super Admin can create projects")

    project = models.Project(
        user_id=current_user.id,
        organization_id=membership.organization_id,
        name=payload.name,
        description=payload.description,
        project_type=payload.project_type,
        priority=payload.priority,
        tags=payload.tags,
        repository_url=payload.repository_url,
        test_case_counter=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_out(project, db)


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_current_membership(db, current_user)

    if membership.role == "super_admin":
        projects = (
            db.query(models.Project)
            .filter(models.Project.organization_id == membership.organization_id)
            .order_by(models.Project.modified_at.desc())
            .all()
        )
    else:
        assigned_ids = [
            a.project_id
            for a in db.query(models.ProjectAssignment)
            .filter(models.ProjectAssignment.user_id == current_user.id)
            .all()
        ]
        projects = (
            db.query(models.Project)
            .filter(models.Project.id.in_(assigned_ids))
            .order_by(models.Project.modified_at.desc())
            .all()
            if assigned_ids
            else []
        )
    return [_to_out(p, db) for p in projects]


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = get_owned_project(project_id, db, current_user)
    return _to_out(project, db)


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = get_owned_project(project_id, db, current_user)
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.project_type is not None:
        project.project_type = payload.project_type
    if payload.priority is not None:
        project.priority = payload.priority
    if payload.tags is not None:
        project.tags = payload.tags
    if payload.repository_url is not None:
        project.repository_url = payload.repository_url
    db.commit()
    db.refresh(project)
    return _to_out(project, db)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    membership = get_current_membership(db, current_user)
    if membership.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only the Super Admin can delete projects")
    project = get_owned_project(project_id, db, current_user)
    db.delete(project)
    db.commit()
    return None
