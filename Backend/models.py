from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, func
)
from sqlalchemy.orm import relationship
from database import Base


# Jira-style subscription plans (Module 1). No billing gateway yet (out of
# scope), so plans just define a seat limit that Super Admins operate under.
PLAN_SEAT_LIMITS = {
    "starter": 5,
    "professional": 10,
    "enterprise": None,  # None = unlimited
}


class Organization(Base):
    """A tenant / company account. Every user belongs to exactly one
    Organization, created automatically at signup with the user as its
    first Super Admin (Module 1)."""
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    plan = Column(String(30), nullable=False, default="professional")  # starter | professional | enterprise
    max_team_members = Column(Integer, nullable=False, default=10)  # excludes the Super Admin seat
    subscription_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    memberships = relationship(
        "OrganizationMembership", back_populates="organization", cascade="all, delete-orphan"
    )
    projects = relationship(
        "Project", back_populates="organization", cascade="all, delete-orphan"
    )


class OrganizationMembership(Base):
    """Links a User to an Organization with a role (Super Admin / Team
    Member) and an active/disabled status (Module 1)."""
    __tablename__ = "organization_memberships"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="team_member")  # super_admin | team_member
    status = Column(String(20), nullable=False, default="active")     # active | disabled
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="memberships")


class ProjectAssignment(Base):
    """Which Team Members can access a given Project (Module 1: Project
    Access Control). Super Admins always have full access regardless of
    rows here."""
    __tablename__ = "project_assignments"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="assignments")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    projects = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )
    memberships = relationship(
        "OrganizationMembership", back_populates="user", cascade="all, delete-orphan"
    )


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    project_type = Column(String(100), nullable=True)
    priority = Column(String(20), nullable=True)
    tags = Column(String(255), nullable=True)
    repository_url = Column(String(500), nullable=True)
    test_case_counter = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    modified_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="projects")
    organization = relationship("Organization", back_populates="projects")
    assignments = relationship(
        "ProjectAssignment", back_populates="project", cascade="all, delete-orphan"
    )

    test_case_history = relationship(
        "TestCaseHistory", back_populates="project", cascade="all, delete-orphan"
    )
    test_cases = relationship(
        "TestCase", back_populates="project", cascade="all, delete-orphan"
    )
    bug_report_history = relationship(
        "BugReportHistory", back_populates="project", cascade="all, delete-orphan"
    )
    automation_history = relationship(
        "AutomationHistory", back_populates="project", cascade="all, delete-orphan"
    )
    screenshot_history = relationship(
        "ScreenshotAnalysisHistory", back_populates="project", cascade="all, delete-orphan"
    )


class TestCaseHistory(Base):
    __tablename__ = "test_case_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    generated_test_cases = Column(Text, nullable=False)  # JSON-serialized list of test cases
    starting_test_case_id = Column(Integer, nullable=False)
    ending_test_case_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="test_case_history")


class TestCase(Base):
    """Individual, persisted test case row. This is what powers the
    per-project test case table (view / edit / delete / sequential numbering),
    as opposed to TestCaseHistory which just keeps a raw audit log of each
    generation batch."""
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    tc_number = Column(Integer, nullable=False)          # sequential number within the project (1, 2, 3, ...)
    display_id = Column(String(50), nullable=False)      # e.g. TC-001
    title = Column(Text, nullable=False)
    type = Column(String(50), nullable=True)
    steps = Column(Text, nullable=True)
    expected = Column(Text, nullable=True)
    priority = Column(String(20), nullable=True)
    source = Column(String(30), nullable=False, default="generated")  # generated | upload | screenshot | manual
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="test_cases")


class BugReportHistory(Base):
    __tablename__ = "bug_report_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    generated_report = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="bug_report_history")


class AutomationHistory(Base):
    __tablename__ = "automation_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    generated_script = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="automation_history")


class ScreenshotAnalysisHistory(Base):
    __tablename__ = "screenshot_analysis_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    image_path = Column(String(500), nullable=False)  # comma-separated filenames when multiple images (Module 2)
    user_story = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    test_type = Column(String(50), nullable=True)
    generated_analysis = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="screenshot_history")


class PasswordResetToken(Base):
    """Supports the Forgot Password flow (Module 3)."""
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Integer, nullable=False, default=0)  # 0 = unused, 1 = used
    created_at = Column(DateTime(timezone=True), server_default=func.now())
