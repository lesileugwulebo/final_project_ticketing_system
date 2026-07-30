from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, RoleChecker
from app.core.database import get_db
from app.models.models import (
    Ticket, TicketStatus, TicketPriority, User, UserRole, 
    Comment, Attachment, SLAPolicy, Category, Department
)
from app.schemas import schemas

router = APIRouter()

def calculate_sla_due(priority: TicketPriority, db: Session) -> Optional[datetime]:
    """Helper function to calculate SLA deadline based on target priority policies"""
    policy = db.query(SLAPolicy).filter(SLAPolicy.priority == priority).first()
    if not policy:
        # Defaults if no database record exists yet
        offsets = {
            TicketPriority.LOW: 72,
            TicketPriority.MEDIUM: 48,
            TicketPriority.HIGH: 12,
            TicketPriority.CRITICAL: 4
        }
        hours = offsets.get(priority, 48)
    else:
        hours = policy.resolution_time_hours
        
    return datetime.utcnow() + timedelta(hours=hours)


@router.get("/", response_model=List[schemas.TicketShort])
def read_tickets(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[TicketStatus] = None,
    priority_filter: Optional[TicketPriority] = None,
    current_user: User = Depends(get_current_user)
):
    """Retrieve list of tickets matching role permissions (Employees only see their own tickets)"""
    query = db.query(Ticket)
    
    # Enforce Role Scope
    if current_user.role == UserRole.EMPLOYEE:
        query = query.filter(Ticket.creator_id == current_user.id)
    elif current_user.role == UserRole.ENGINEER:
        # Engineers can view all, but typically filter down
        pass
        
    if status_filter:
        query = query.filter(Ticket.status == status_filter)
    if priority_filter:
        query = query.filter(Ticket.priority == priority_filter)
        
    return query.offset(skip).limit(limit).all()


@router.post("/", response_model=schemas.TicketShort, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: schemas.TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit a support ticket and calculate its SLA resolution deadline"""
    # Verify foreign keys
    cat = db.query(Category).filter(Category.id == ticket_in.category_id).first()
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        
    dept = db.query(Department).filter(Department.id == ticket_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
        
    sla_due = calculate_sla_due(ticket_in.priority, db)
    
    db_ticket = Ticket(
        title=ticket_in.title,
        description=ticket_in.description,
        priority=ticket_in.priority,
        status=TicketStatus.OPEN,
        creator_id=current_user.id,
        category_id=ticket_in.category_id,
        department_id=ticket_in.department_id,
        sla_due_at=sla_due
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


@router.get("/{ticket_id}", response_model=schemas.TicketDetail)
def read_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve detailed ticket properties, comments timeline, and attachments"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # Enforce permission checks
    if current_user.role == UserRole.EMPLOYEE and ticket.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to ticket record")
        
    # Filter comments: remove internal logs if accessed by non-support employee
    if current_user.role == UserRole.EMPLOYEE:
        ticket.comments = [c for c in ticket.comments if not c.is_internal]
        
    return ticket


@router.patch("/{ticket_id}/assign", response_model=schemas.TicketShort)
def assign_ticket(
    ticket_id: int,
    assignee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker([UserRole.HELPDESK, UserRole.ADMIN]))
):
    """Assign or transfer ticket ownership to a Support Engineer (Help Desk / Admin only)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    engineer = db.query(User).filter(User.id == assignee_id, User.role == UserRole.ENGINEER).first()
    if not engineer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Assignee must be an active IT Support Engineer")
        
    ticket.assigned_engineer_id = assignee_id
    ticket.status = TicketStatus.IN_PROGRESS
    db.commit()
    db.refresh(ticket)
    return ticket


@router.patch("/{ticket_id}/status", response_model=schemas.TicketShort)
def update_ticket_status(
    ticket_id: int,
    new_status: TicketStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Transition ticket state (Engineers and Help Desk can change all, Employees can only close own)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # Scope check
    if current_user.role == UserRole.EMPLOYEE:
        if ticket.creator_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if new_status != TicketStatus.CLOSED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Employees can only close their tickets")
    else:
        # Helpdesk or Engineer
        if current_user.role == UserRole.ENGINEER and ticket.assigned_engineer_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit unassigned tickets")
            
    ticket.status = new_status
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/comments", response_model=schemas.Comment)
def add_comment(
    ticket_id: int,
    comment_in: schemas.CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add discussion text comments to a ticket (verifies role filters for internal notes)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    if current_user.role == UserRole.EMPLOYEE:
        if ticket.creator_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        if comment_in.is_internal:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Employees cannot submit internal support notes")
            
    db_comment = Comment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        content=comment_in.content,
        is_internal=comment_in.is_internal
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@router.post("/{ticket_id}/upload", response_model=schemas.Attachment)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload support attachments (verifies sizes under 10MB, and filters mime types)"""
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        
    # Permission verification
    if current_user.role == UserRole.EMPLOYEE and ticket.creator_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
    # Read file properties
    contents = await file.read()
    file_size = len(contents)
    
    # 1. Size constraint (10 MB)
    MAX_SIZE = 10 * 1024 * 1024
    if file_size > MAX_SIZE:
        raise HTTPException(status_code=status.HTTP_413_PAYLOAD_TOO_LARGE, detail="File too large. Max allowed is 10MB.")
        
    # 2. MIME type white-list
    ALLOWED_TYPES = [
        "image/jpeg", "image/png", "image/webp", "application/pdf", 
        "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file format")
        
    # Mock Storage Sync (AWS S3)
    mock_s3_url = f"https://s3.amazonaws.com/{settings.AWS_S3_BUCKET}/tickets/{ticket_id}/{file.filename}"
    
    db_attachment = Attachment(
        ticket_id=ticket_id,
        file_name=file.filename,
        file_path=mock_s3_url,
        file_size=file_size,
        mime_type=file.content_type
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment
