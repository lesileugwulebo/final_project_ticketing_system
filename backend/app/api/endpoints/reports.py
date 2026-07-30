import io
from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import RoleChecker
from app.core.database import get_db
from app.models.models import User, UserRole, Ticket

router = APIRouter()

@router.get("/export")
def export_tickets_report(
    db: Session = Depends(get_db),
    format: str = Query("csv"),
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.HELPDESK]))
):
    """Export all tickets matching queries in requested formats (Admin/Help Desk only)"""
    if format not in ["csv", "excel", "pdf"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid format type. Must be csv, excel, or pdf")
    tickets = db.query(Ticket).all()
    
    if format == "csv":
        output = io.StringIO()
        output.write("ID,Title,Priority,Status,Created At\n")
        for ticket in tickets:
            output.write(f"{ticket.id},{ticket.title},{ticket.priority.value},{ticket.status.value},{ticket.created_at}\n")
        
        response = StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv"
        )
        response.headers["Content-Disposition"] = "attachment; filename=tickets_report.csv"
        return response
        
    elif format == "excel":
        # Simulate simple binary file return for excel format
        output = io.BytesIO()
        output.write(b"MOCK EXCEL BINARY DATA HEADERS\n")
        for ticket in tickets:
            output.write(f"TICKET_{ticket.id}_ROW\n".encode())
            
        output.seek(0)
        response = StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        response.headers["Content-Disposition"] = "attachment; filename=tickets_report.xlsx"
        return response
        
    else:  # pdf
        # Simulate simple PDF print format return
        output = io.BytesIO()
        output.write(b"%PDF-1.4\n")
        output.write(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
        output.write(f"MOCK TICKET REPORT PDF SIZE: {len(tickets)} tickets".encode())
        
        output.seek(0)
        response = StreamingResponse(
            output,
            media_type="application/pdf"
        )
        response.headers["Content-Disposition"] = "attachment; filename=tickets_report.pdf"
        return response
