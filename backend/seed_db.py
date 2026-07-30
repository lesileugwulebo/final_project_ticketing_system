import sys
import os
# Adjust path to import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime, timedelta
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.models import (
    Department, User, Category, SLAPolicy, Ticket, Comment,
    UserRole, TicketStatus, TicketPriority
)

def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).count() > 0:
            print("Database already contains data. Skipping seed.")
            return
            
        print("Seeding database...")

        # 1. Seed Departments
        dept_infra = Department(name="IT Infrastructure", description="Handles networks, servers, and VPN connections")
        dept_soft = Department(name="Software Engineering", description="Handles application bugs and features development")
        dept_hr = Department(name="Human Resources", description="Handles employee onboarding and internal policies")
        dept_fin = Department(name="Finance", description="Handles accounting, billing, and procurement systems")
        db.add_all([dept_infra, dept_soft, dept_hr, dept_fin])
        db.commit()

        # 2. Seed SLA Policies
        sla_low = SLAPolicy(priority=TicketPriority.LOW, response_time_hours=24, resolution_time_hours=72)
        sla_med = SLAPolicy(priority=TicketPriority.MEDIUM, response_time_hours=12, resolution_time_hours=48)
        sla_high = SLAPolicy(priority=TicketPriority.HIGH, response_time_hours=4, resolution_time_hours=12)
        sla_crit = SLAPolicy(priority=TicketPriority.CRITICAL, response_time_hours=1, resolution_time_hours=4)
        db.add_all([sla_low, sla_med, sla_high, sla_crit])
        db.commit()

        # 3. Seed Categories
        cat_hw = Category(name="Hardware Outage", description="Laptops, monitors, keycards, or device failures")
        cat_sw = Category(name="Software Bug", description="System errors or crashes in internal tools")
        cat_net = Category(name="Network & VPN", description="Wi-Fi issues, VPN tunnel drops, routing conflicts")
        cat_id = Category(name="Identity & Access", description="Password resets, Active Directory lockers, email access requests")
        db.add_all([cat_hw, cat_sw, cat_net, cat_id])
        db.commit()

        # 4. Seed Users (Default password: Password123)
        hashed = hash_password("Password123")
        admin = User(email="admin@verdad.com", hashed_password=hashed, full_name="Anna Administrator", role=UserRole.ADMIN, department_id=dept_infra.id)
        helpdesk = User(email="helpdesk@verdad.com", hashed_password=hashed, full_name="Hal Helpdesk", role=UserRole.HELPDESK, department_id=dept_infra.id)
        eng1 = User(email="engineer1@verdad.com", hashed_password=hashed, full_name="Edward Engineer", role=UserRole.ENGINEER, department_id=dept_infra.id)
        eng2 = User(email="engineer2@verdad.com", hashed_password=hashed, full_name="Elena Engineer", role=UserRole.ENGINEER, department_id=dept_soft.id)
        emp1 = User(email="employee1@verdad.com", hashed_password=hashed, full_name="Emeka Employee", role=UserRole.EMPLOYEE, department_id=dept_hr.id)
        emp2 = User(email="employee2@verdad.com", hashed_password=hashed, full_name="Esosa Employee", role=UserRole.EMPLOYEE, department_id=dept_fin.id)
        
        db.add_all([admin, helpdesk, eng1, eng2, emp1, emp2])
        db.commit()

        # 5. Seed Demonstration Tickets
        t1 = Ticket(
            title="Critical Network Outage in Lagos Office",
            description="The primary Cisco switch is showing solid red amber lights, and all Ethernet drops are offline.",
            status=TicketStatus.ESCALATED,
            priority=TicketPriority.CRITICAL,
            creator_id=emp1.id,
            category_id=cat_net.id,
            department_id=dept_infra.id,
            sla_due_at=datetime.utcnow() + timedelta(hours=1)
        )
        t2 = Ticket(
            title="Database Access Credentials Lockout",
            description="I am locked out of the finance staging database after 3 incorrect attempts. Need credentials reset.",
            status=TicketStatus.IN_PROGRESS,
            priority=TicketPriority.HIGH,
            creator_id=emp2.id,
            assigned_engineer_id=eng1.id,
            category_id=cat_id.id,
            department_id=dept_fin.id,
            sla_due_at=datetime.utcnow() + timedelta(hours=12)
        )
        t3 = Ticket(
            title="Printer installation driver issues",
            description="Unable to connect my local laptop to the office color printer.",
            status=TicketStatus.OPEN,
            priority=TicketPriority.LOW,
            creator_id=emp1.id,
            category_id=cat_hw.id,
            department_id=dept_infra.id,
            sla_due_at=datetime.utcnow() + timedelta(hours=72)
        )
        db.add_all([t1, t2, t3])
        db.commit()

        # 6. Seed Discussion Comments
        c1 = Comment(ticket_id=t1.id, user_id=emp1.id, content="Switch rebooted manually, but port link lights remain unlit.", is_internal=False)
        c2 = Comment(ticket_id=t1.id, user_id=helpdesk.id, content="Helpdesk escalated this critical network ticket to the IT Infrastructure team for physical check.", is_internal=True)
        c3 = Comment(ticket_id=t2.id, user_id=eng1.id, content="Verifying identification details. Resubmitting authorization check to finance Lead.", is_internal=True)
        c4 = Comment(ticket_id=t2.id, user_id=eng1.id, content="Access restored, please attempt login using the temporary credentials sent to your email.", is_internal=False)
        db.add_all([c1, c2, c3, c4])
        db.commit()

        print("Seeding complete successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
