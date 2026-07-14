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
    """Create all tables that don't exist yet, then patch any columns that
    were added to the models later but are missing on an already-existing
    table (Base.metadata.create_all only creates brand-new tables -- it
    never ALTERs existing ones). Call once on app startup."""
    import models  # noqa: F401  (ensures models are registered on Base before create_all)
    Base.metadata.create_all(bind=engine)
    _sync_missing_columns()
    _backfill_null_defaults()


def _compile_server_default(column):
    """Return SQL text for a column's server_default, handling both text()
    clauses (has .text) and function expressions like func.now() (needs
    compiling)."""
    arg = column.server_default.arg
    if hasattr(arg, "text"):
        return arg.text
    return str(arg.compile(dialect=engine.dialect, compile_kwargs={"literal_binds": True}))


def _sync_missing_columns():
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue  # brand-new table, create_all already handled it
        existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in existing_columns:
                continue
            col_type = column.type.compile(dialect=engine.dialect)
            default_clause = ""
            if column.server_default is not None:
                # e.g. DateTime(server_default=func.now()) -> DEFAULT now()
                default_clause = f" DEFAULT {_compile_server_default(column)}"
            elif column.default is not None and getattr(column.default, "is_scalar", False):
                default_clause = f" DEFAULT {column.default.arg!r}" if isinstance(column.default.arg, str) else f" DEFAULT {column.default.arg}"
            elif not column.nullable:
                # Provide a safe default so the ALTER doesn't fail on existing rows.
                if str(col_type).upper().startswith("BOOLEAN"):
                    default_clause = " DEFAULT FALSE"
                elif str(col_type).upper() in ("INTEGER", "BIGINT", "NUMERIC"):
                    default_clause = " DEFAULT 0"
            nullable_clause = "" if column.nullable else " NOT NULL" if default_clause else ""
            ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}{default_clause}{nullable_clause}'
            with engine.begin() as conn:
                conn.execute(text(ddl))
            print(f"[init_db] Added missing column {table.name}.{column.name}")


def _backfill_null_defaults():
    """For columns that have a server_default (e.g. registration_date =
    func.now()), fill in any existing NULL rows -- this covers rows that
    were inserted before the column existed, or before it had a default,
    since Postgres doesn't retroactively apply a new DEFAULT to old rows."""
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        for column in table.columns:
            if column.server_default is None:
                continue
            ddl = (
                f'UPDATE "{table.name}" SET "{column.name}" = {_compile_server_default(column)} '
                f'WHERE "{column.name}" IS NULL'
            )
            with engine.begin() as conn:
                result = conn.execute(text(ddl))
                if result.rowcount:
                    print(f"[init_db] Backfilled {result.rowcount} NULL value(s) in {table.name}.{column.name}")
