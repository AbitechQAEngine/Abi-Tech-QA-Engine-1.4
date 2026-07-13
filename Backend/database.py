"""
Database connection setup (PostgreSQL via SQLAlchemy).

Set DATABASE_URL in your environment, e.g.:
  postgresql://user:password@host:5432/dbname

If your provider gives you a URL starting with "postgres://" (Heroku/Render style),
we normalize it to "postgresql://" since SQLAlchemy 2.x requires that prefix.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Set it to your PostgreSQL connection string (Neon/Supabase/Render/etc.)."
    )

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Most managed Postgres providers (Neon, Supabase, Render) require SSL.
connect_args = {}
if "sslmode" not in DATABASE_URL:
    connect_args = {"sslmode": "require"}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables that don't exist yet. Call once on app startup."""
    import models  # noqa: F401  (ensures models are registered on Base before create_all)
    Base.metadata.create_all(bind=engine)
