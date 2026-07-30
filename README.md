# Verdad Tickets: Secure AWS-GCP Multi-Cloud Ticket Management System

This repository hosts the **Enterprise Ticket Management System** designed for Verdad Solutions as a MIVA Open University MIT Professional Master's Project. It showcases a highly resilient multi-cloud architecture utilizing **AWS** as the active production environment and **GCP** as a hot/warm standby disaster recovery target connected via an **IPSec Site-to-Site VPN**.

---

## 🚀 Key Features
* **Role-Based Access Control (RBAC)**: Support for Administrator, Help Desk Officer, IT Support Engineer, and Employee roles.
* **Cryptographic Security**: Passwords hashed with Argon2id; stateless session handling via short-lived JWT access tokens and secure httpOnly refresh cookies.
* **Database Synchronization**: Near-real-time active MySQL Binlog Replication over a secure multi-cloud Site-to-Site VPN tunnel (satisfying a 15-minute RPO).
* **Automated DR Verification**: GCP-based serverless daily routine verifying database backup integrity automatically.
* **Automated DNS Failover**: Under-30-minute recovery time (RTO) redirecting client requests via Route 53/Cloudflare health monitors to GCP.

---

## 📁 Repository Structure
```
verdad-tickets/
├── backend/                  # Python FastAPI REST Service
│   ├── app/
│   │   ├── api/              # Route controllers & dependencies
│   │   ├── core/             # Database session pool & security rules
│   │   ├── models/           # SQLAlchemy 3NF models
│   │   └── schemas/          # Pydantic validation rules
│   ├── seed_db.py            # Local DB seeding automation script
│   └── requirements.txt      # Python dependencies
├── docs/                     # Project academic reports & specifications
│   ├── PROPOSAL.md           # MIT Project Proposal
│   └── SYSTEM_DESIGN.md      # Full architecture & network schema
├── .gitignore                # Target filters
├── LICENSE                   # MIT License file
├── CHANGELOG.md              # Project history tracker
└── CONTRIBUTING.md           # Engineering guidelines
```

---

## 🛠️ Local Development Setup

To replicate this environment locally, we run the services containerized.

### Prerequisites
* Docker installed on your host machine.
* Python 3.11+ (if running bare-metal).

### Steps
1. **Clone the repository**:
   ```bash
   git clone <repository_url>
   cd verdad-tickets
   ```
2. **Install Python dependencies (for local linting/testing)**:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Or `.venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```
3. **Seed the Local Database**:
   ```bash
   python seed_db.py
   ```
4. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   Open [http://localhost:8000/docs](http://localhost:8000/docs) in your browser to access the auto-generated Swagger/OpenAPI interactive REST specifications.

---

## 🔒 Disaster Recovery Validation (DR Testing)
The standby GCP Cloud SQL database remains in replication-read status. During an active AWS outage:
1. Run `scripts/failover_trigger.sh` or send a POST request to `/api/v1/dr/failover`.
2. The endpoint promotes the GCP database to a standalone master and starts the Cloud Run container instances.
3. Access is restored at the secondary site with no more than 15 minutes of transactional data loss (RPO) and completed in under 30 minutes (RTO).
