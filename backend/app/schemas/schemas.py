from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.models import UserRole, TicketStatus, TicketPriority, BackupStatus

# --- Helper Base Config ---
class BaseSchema(BaseModel):
    class Config:
        from_attributes = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

# --- Department Schemas ---
class DepartmentBase(BaseSchema):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class DepartmentCreate(DepartmentBase):
    pass

class Department(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- Category Schemas ---
class CategoryBase(BaseSchema):
    name: str = Field(..., max_length=100)
    description: Optional[str] = Field(None, max_length=255)

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- User Schemas ---
class UserBase(BaseSchema):
    email: EmailStr
    full_name: str = Field(..., max_length=100)
    role: UserRole
    department_id: Optional[int] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=64)

class UserUpdate(BaseSchema):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    password: Optional[str] = Field(None, min_length=8, max_length=64)
    is_active: Optional[bool] = None

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

# --- Attachment Schemas ---
class AttachmentBase(BaseSchema):
    file_name: str
    file_path: str
    file_size: int
    mime_type: str

class Attachment(AttachmentBase):
    id: int
    ticket_id: int
    comment_id: Optional[int] = None
    uploaded_at: datetime

# --- Comment Schemas ---
class CommentBase(BaseSchema):
    content: str
    is_internal: bool = False

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: int
    ticket_id: int
    user_id: int
    created_at: datetime
    user: User  # Include user profile of writer

# --- SLA Policy Schemas ---
class SLAPolicyBase(BaseSchema):
    priority: TicketPriority
    response_time_hours: int
    resolution_time_hours: int

class SLAPolicy(SLAPolicyBase):
    id: int
    created_at: datetime

# --- Ticket Schemas ---
class TicketBase(BaseSchema):
    title: str = Field(..., min_length=10, max_length=150)
    description: str = Field(..., min_length=20)
    priority: TicketPriority = TicketPriority.MEDIUM

class TicketCreate(TicketBase):
    category_id: int
    department_id: int

class TicketUpdate(BaseSchema):
    title: Optional[str] = Field(None, min_length=10, max_length=150)
    description: Optional[str] = Field(None, min_length=20)
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_engineer_id: Optional[int] = None

class TicketShort(TicketBase):
    id: int
    status: TicketStatus
    creator_id: int
    assigned_engineer_id: Optional[int] = None
    category_id: int
    department_id: int
    sla_due_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class TicketDetail(TicketShort):
    creator: User
    assigned_engineer: Optional[User] = None
    category: Category
    department: Department
    comments: List[Comment] = []
    attachments: List[Attachment] = []

# --- Audit Log Schemas ---
class AuditLog(BaseSchema):
    id: int
    user_id: Optional[int] = None
    action: str
    details: str
    ip_address: str
    created_at: datetime

# --- Backup Verification Schemas ---
class BackupVerificationLog(BaseSchema):
    id: int
    filename: str
    status: BackupStatus
    integrity_check_results: str
    temporary_instance_name: str
    run_at: datetime
