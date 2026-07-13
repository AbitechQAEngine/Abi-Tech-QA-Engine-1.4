from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ---------- User / Auth ----------

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime
    role: Optional[str] = None            # super_admin | team_member
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Organization / Subscription (Module 1) ----------

class OrganizationOut(BaseModel):
    id: int
    name: str
    plan: str
    max_team_members: int
    subscription_expiry: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MemberOut(BaseModel):
    membership_id: int
    user_id: int
    name: str
    email: str
    role: str
    status: str
    created_at: datetime


class MemberInvite(BaseModel):
    """Since email-invitation workflow is a Future Enhancement, the Super
    Admin adds a member directly with a temporary password (FR-002)."""
    name: str
    email: EmailStr
    temp_password: str


class MemberRoleUpdate(BaseModel):
    status: Optional[str] = None  # active | disabled


class ResetMemberPassword(BaseModel):
    new_password: str


class ProjectAssignRequest(BaseModel):
    user_ids: list[int]


class OrgDashboardOut(BaseModel):
    organization: OrganizationOut
    total_projects: int
    active_users: int
    available_seats: Optional[int]  # None = unlimited (enterprise)
    used_seats: int
    ai_usage: int  # total AI generations (test cases + automation + bug reports + screenshots)
    recent_projects: list
    recent_ai_activities: list


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info):
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


# ---------- Project ----------

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[str] = None
    repository_url: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[str] = None
    repository_url: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    project_type: Optional[str] = None
    priority: Optional[str] = None
    tags: Optional[str] = None
    repository_url: Optional[str] = None
    test_case_counter: int
    created_at: datetime
    modified_at: datetime
    assigned_user_ids: Optional[list[int]] = None

    class Config:
        from_attributes = True


# ---------- Test Case (persisted rows) ----------

class TestCaseOut(BaseModel):
    id: int
    tc_number: int
    display_id: str
    title: str
    type: Optional[str] = None
    steps: Optional[str] = None
    expected: Optional[str] = None
    priority: Optional[str] = None
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class TestCaseUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[str] = None
    steps: Optional[str] = None
    expected: Optional[str] = None
    priority: Optional[str] = None


# ---------- Test Case Sequencing (Module 7) ----------

class TestCaseGenerateRequest(BaseModel):
    project_id: int
    prompt: str
    count: int = 10
    # If the user already knows they want a custom starting id (skips the Yes/No prompt)
    custom_start_id: Optional[int] = None


class TestCaseContinueCheck(BaseModel):
    """Returned before generation so the frontend can show the Yes/No prompt."""
    current_counter: int
    next_id_if_yes: int


class TestCaseHistoryOut(BaseModel):
    id: int
    prompt: str
    generated_test_cases: str
    starting_test_case_id: int
    ending_test_case_id: int
    created_at: datetime

    class Config:
        from_attributes = True
