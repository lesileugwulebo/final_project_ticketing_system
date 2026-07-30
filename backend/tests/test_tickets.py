import pytest
from app.core.security import hash_password, create_access_token
from app.models.models import User, UserRole, Category, Department, Ticket, TicketStatus, TicketPriority

def setup_test_data(db):
    """Seed base entities and return standard authorization headers"""
    dept = Department(name="IT Infrastructure")
    cat = Category(name="Network & VPN")
    db.add_all([dept, cat])
    db.commit()

    hashed = hash_password("password123")
    emp = User(email="emp@verdad.com", hashed_password=hashed, full_name="Emeka Emp", role=UserRole.EMPLOYEE, department_id=dept.id)
    hdo = User(email="hdo@verdad.com", hashed_password=hashed, full_name="Hal HDO", role=UserRole.HELPDESK, department_id=dept.id)
    eng = User(email="eng@verdad.com", hashed_password=hashed, full_name="Edward Eng", role=UserRole.ENGINEER, department_id=dept.id)
    db.add_all([emp, hdo, eng])
    db.commit()

    emp_token = create_access_token(emp.id, "employee")
    hdo_token = create_access_token(hdo.id, "helpdesk")
    
    return {
        "dept_id": dept.id,
        "cat_id": cat.id,
        "emp": emp,
        "hdo": hdo,
        "eng": eng,
        "emp_headers": {"Authorization": f"Bearer {emp_token}"},
        "hdo_headers": {"Authorization": f"Bearer {hdo_token}"}
    }

def test_create_ticket_success(client, db_session):
    """Test standard ticket creation computes SLA deadlines"""
    data = setup_test_data(db_session)

    payload = {
        "title": "Lagos Office switch offline",
        "description": "All ethernet lines are dead, link lights are red.",
        "priority": "critical",
        "category_id": data["cat_id"],
        "department_id": data["dept_id"]
    }
    
    response = client.post(
        "/api/v1/tickets/",
        json=payload,
        headers=data["emp_headers"]
    )
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["title"] == "Lagos Office switch offline"
    assert res_data["status"] == "open"
    assert res_data["sla_due_at"] is not None

def test_assign_ticket_permission(client, db_session):
    """Test that only HDO/Admin roles can assign engineers, Employees get 403"""
    data = setup_test_data(db_session)
    
    # Create ticket
    ticket = Ticket(
        title="Lagos switch error",
        description="All ethernet ports dead link",
        priority=TicketPriority.CRITICAL,
        creator_id=data["emp"].id,
        category_id=data["cat_id"],
        department_id=data["dept_id"]
    )
    db_session.add(ticket)
    db_session.commit()

    # 1. Employee attempts to assign (should fail with 403)
    response_emp = client.patch(
        f"/api/v1/tickets/{ticket.id}/assign",
        params={"assignee_id": data["eng"].id},
        headers=data["emp_headers"]
    )
    assert response_emp.status_code == 403

    # 2. Help Desk attempts to assign (should succeed with 200)
    response_hdo = client.patch(
        f"/api/v1/tickets/{ticket.id}/assign",
        params={"assignee_id": data["eng"].id},
        headers=data["hdo_headers"]
    )
    assert response_hdo.status_code == 200
    assert response_hdo.json()["assigned_engineer_id"] == data["eng"].id
    assert response_hdo.json()["status"] == "in_progress"
