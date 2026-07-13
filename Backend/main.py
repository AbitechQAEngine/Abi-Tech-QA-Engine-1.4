from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
for env_file in [os.path.join(BASE_DIR, ".env"), os.path.join(os.getcwd(), ".env")]:
    if os.path.exists(env_file):
        load_dotenv(env_file, override=True)
        break

# GROQ_API_KEY must be set as a real environment variable (Render dashboard,
# or a local .env file that is NOT committed to git). No hardcoded fallback.

from routers import testcases, automation, bugreports, auth, projects, organizations

app = FastAPI(title="QA Assistant API", version="1.0.0")

# Comma-separated list of allowed origins, e.g.:
# ALLOWED_ORIGINS=https://your-site.netlify.app,http://localhost:3000
_origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(testcases.router, prefix="/api/testcases", tags=["Test Cases"])
app.include_router(automation.router, prefix="/api/automation", tags=["Automation"])
app.include_router(bugreports.router, prefix="/api/bugreports", tags=["Bug Reports"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["Organizations"])


@app.on_event("startup")
def on_startup():
    from database import init_db
    init_db()

@app.get("/")
def root():
    key = os.getenv("GROQ_API_KEY")
    return {
        "message": "QA Assistant API is running",
        "ai_provider": "Groq (Llama 3 70B) - Free",
        "api_key_loaded": bool(key),
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
