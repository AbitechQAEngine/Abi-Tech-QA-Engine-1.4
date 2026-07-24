from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
from groq import Groq
import asyncio
import os, io, zipfile
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

class AutomationRequest(BaseModel):
    project_id: int
    test_cases: List[dict]
    framework: str

PLAYWRIGHT_PROMPT = """You are a senior automation engineer. Generate Playwright JavaScript automation scripts.
Use async/await with @playwright/test. Include proper selectors and assertions.
Return ONLY raw JavaScript code, no markdown, no code blocks."""

SELENIUM_PROMPT = """You are a senior automation engineer. Generate Selenium JavaScript (WebdriverIO) automation scripts.
Use async/await with mocha framework. Include proper wait strategies and assertions.
Return ONLY raw JavaScript code, no markdown, no code blocks."""

def get_field(tc: dict, *keys) -> str:
    """Try multiple key names and return first match."""
    for key in keys:
        val = tc.get(key, "")
        if val and str(val).strip() and str(val).strip() != "nan":
            return str(val).strip()
    return ""

def normalize_tc(tc: dict) -> dict:
    """Normalize a single test case dict to standard keys."""
    return {
        "id":       get_field(tc, "id", "ID", "test id", "tc id"),
        "title":    get_field(tc, "title", "Title", "test title", "test case title", "name", "description"),
        "steps":    get_field(tc, "steps", "Steps", "test steps", "Test Steps", "actions"),
        "expected": get_field(tc, "expected", "Expected Result", "Expected", "expected result",
                              "expected results", "expected outcome", "result", "outcome"),
        "type":     get_field(tc, "type", "Type", "test type") or "positive",
        "priority": get_field(tc, "priority", "Priority") or "Medium",
    }

def generate_script(test_cases, framework):
    client = get_client()
    system = PLAYWRIGHT_PROMPT if framework == "playwright" else SELENIUM_PROMPT

    # Normalize all test cases before building prompt
    normalized = [normalize_tc(tc) for tc in test_cases[:10]]

    tc_text = "\n".join([
        f"Test: {tc['title']}\nSteps: {tc['steps']}\nExpected: {tc['expected']}"
        for tc in normalized
    ])

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": f"Generate {framework} automation script:\n{tc_text}"}
        ],
        temperature=0.2,
        max_tokens=3000
    )
    content = response.choices[0].message.content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        content = parts[1] if len(parts) > 1 else content
        if content.startswith(("javascript", "js")):
            content = content.split("\n", 1)[1] if "\n" in content else content
    return content.strip()

@router.post("/generate")
async def generate_automation(
    request: AutomationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = get_owned_project(request.project_id, db, current_user)
    try:
        if request.framework == "both":
            # Run both generations concurrently in worker threads instead of
            # blocking the event loop twice, back to back.
            pw, sel = await asyncio.gather(
                asyncio.to_thread(generate_script, request.test_cases, "playwright"),
                asyncio.to_thread(generate_script, request.test_cases, "selenium"),
            )

            db.add(models.AutomationHistory(project_id=project.id, prompt="playwright (both)", generated_script=pw))
            db.add(models.AutomationHistory(project_id=project.id, prompt="selenium (both)", generated_script=sel))
            db.commit()

            buf = io.BytesIO()
            with zipfile.ZipFile(buf, "w") as zf:
                zf.writestr("playwright/tests/generated.spec.js", pw)
                zf.writestr("selenium/test/generated.test.js", sel)
                zf.writestr("playwright/package.json", '{"name":"playwright-tests","scripts":{"test":"npx playwright test"},"devDependencies":{"@playwright/test":"^1.40.0"}}')
                zf.writestr("selenium/package.json", '{"name":"selenium-tests","scripts":{"test":"npx wdio run wdio.conf.js"},"devDependencies":{"@wdio/cli":"^8.0.0","webdriverio":"^8.0.0"}}')
            buf.seek(0)
            return StreamingResponse(buf, media_type="application/zip",
                headers={"Content-Disposition": "attachment; filename=automation_scripts.zip"})
        else:
            script = await asyncio.to_thread(generate_script, request.test_cases, request.framework)
            ext = "spec.js" if request.framework == "playwright" else "test.js"

            db.add(models.AutomationHistory(project_id=project.id, prompt=request.framework, generated_script=script))
            db.commit()

            return {"framework": request.framework, "script": script, "filename": f"generated.{ext}"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
