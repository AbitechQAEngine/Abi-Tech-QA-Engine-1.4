from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from groq import Groq
import asyncio
import os, json
from sqlalchemy.orm import Session

from database import get_db
import models
from deps import get_current_user, get_owned_project

router = APIRouter()

def get_client():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not set")
    return Groq(api_key=api_key)

class BugReportRequest(BaseModel):
    project_id: int
    title: str
    description: str
    environment: Optional[str] = ""
    browser: Optional[str] = ""
    actual_behavior: Optional[str] = ""

SYSTEM_PROMPT = """You are a QA engineer writing professional bug reports.
Return ONLY a valid JSON object with no markdown, no code blocks, no preamble.
Fields: summary, severity (Critical/High/Medium/Low), priority (P1/P2/P3/P4),
preconditions, steps_to_reproduce (array of strings), expected_result, actual_result,
environment, workaround."""

@router.post("/generate")
async def generate_bug_report(
    request: BugReportRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = get_owned_project(request.project_id, db, current_user)

    prompt = f"""Generate bug report for:
Title: {request.title}
Description: {request.description}
Environment: {request.environment}
Browser: {request.browser}
Actual Behavior: {request.actual_behavior}"""
    try:
        client = get_client()
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            max_tokens=1000
        )
        content = response.choices[0].message.content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        report = json.loads(content.strip())

        db.add(models.BugReportHistory(
            project_id=project.id,
            prompt=prompt,
            generated_report=json.dumps(report),
        ))
        db.commit()

        return report
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{project_id}")
async def get_bug_report_history(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = get_owned_project(project_id, db, current_user)
    rows = (
        db.query(models.BugReportHistory)
        .filter(models.BugReportHistory.project_id == project.id)
        .order_by(models.BugReportHistory.created_at.desc())
        .all()
    )
    return [
        {"id": r.id, "prompt": r.prompt, "report": json.loads(r.generated_report), "created_at": r.created_at}
        for r in rows
    ]
