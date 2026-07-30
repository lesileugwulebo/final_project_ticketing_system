# REST API Specifications and Design Document

This document defines the REST API endpoints, JSON request/response structures, input validation schemas, and authorization scopes for the **AWS-GCP Multi-Cloud Enterprise Ticket Management System**. It aligns with **Chapter Three (System Design - API Specs)** of the MIVA guidelines.

---

## 1. REST Endpoint Reference Matrix

| Category | HTTP Method | Path | Request Body | Auth Scope (Roles) | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/login` | `LoginRequest` | Public | Login credentials, returns JWT. Sets httpOnly Cookie. |
| | `POST` | `/api/v1/auth/logout` | None | Authenticated | Clears cookies, invalidates session. |
| | `POST` | `/api/v1/auth/refresh` | None | Authenticated | Rotates access token via refresh token cookie. |
| **Users** | `GET` | `/api/v1/users` | None | `admin`, `helpdesk` | Paginated and filtered users list. |
| | `POST` | `/api/v1/users` | `UserCreate` | `admin` | Creates new user and hashes password. |
| | `GET` | `/api/v1/users/{id}` | None | Self, `admin` | Fetch user profile detail. |
| | `PUT` | `/api/v1/users/{id}` | `UserUpdate` | Self, `admin` | Edit user profile. |
| | `DELETE` | `/api/v1/users/{id}` | None | `admin` | Soft-deletes / disables user. |
| **Tickets**| `GET` | `/api/v1/tickets` | None | Authenticated | List tickets (filtered by permissions/ownership). |
| | `POST` | `/api/v1/tickets` | `TicketCreate` | `employee`, `helpdesk` | Create new ticket, sets SLA due. |
| | `GET` | `/api/v1/tickets/{id}` | None | Creator/Assignee/HDO/Admin | Get detailed ticket object. |
| | `PUT` | `/api/v1/tickets/{id}` | `TicketUpdate` | Creator (if open), HDO/Admin | Update ticket metadata or description. |
| | `PATCH` | `/api/v1/tickets/{id}/status` | `StatusUpdate` | `engineer`, `helpdesk` | Transition ticket state. |
| | `PATCH` | `/api/v1/tickets/{id}/assign` | `AssignRequest` | `helpdesk` | Assign or transfer to an engineer. |
| **Comments**| `GET` | `/api/v1/tickets/{id}/comments` | None | Authorized Roles | Retrieve comment discussion thread. |
| | `POST` | `/api/v1/tickets/{id}/comments`| `CommentCreate` | Authorized Roles | Write comment (supports `is_internal` flag). |
| **Media** | `POST` | `/api/v1/tickets/{id}/upload` | `Multipart/Form` | Creator/Assignee/HDO | Upload files (validated size/mime type). |
| **Reports**| `GET` | `/api/v1/reports/export` | None | `admin`, `helpdesk` | Generates file (PDF/CSV/Excel format parameter). |
| **DR & Sync**| `GET` | `/api/v1/dr/backup-logs` | None | `admin` | Fetch automated daily backup verification runs. |
| | `POST` | `/api/v1/dr/failover` | None | `admin` | Force replication promotion / DNS flip (Simulated). |

---

## 2. Request & Response Schema Models (Pydantic / OpenAPI)

Every request input is strictly validated by FastAPI using Pydantic schema validation.

### 2.1. Authentication Models

#### `LoginRequest` (POST `/api/v1/auth/login`)
```json
{
  "email": "employee1@verdad.com",
  "password": "Password123"
}
```
* **Validation**:
  - `email`: must be a valid email format.
  - `password`: string, length between 8 and 64 characters.

#### `LoginResponse`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
  "token_type": "bearer",
  "user": {
    "id": 5,
    "email": "employee1@verdad.com",
    "full_name": "Emeka Employee",
    "role": "employee",
    "department_id": 3
  }
}
```

---

### 2.2. Ticket Management Models

#### `TicketCreate` (POST `/api/v1/tickets`)
```json
{
  "title": "VPN connection drops every 10 minutes",
  "description": "After upgrading to macOS Sequoia, my Cisco VPN client drops connection repeatedly.",
  "category_id": 3,
  "department_id": 1,
  "priority": "high"
}
```
* **Validation**:
  - `title`: String, min length 10, max length 150 characters.
  - `description`: String, min length 20 characters.
  - `priority`: Enum string (`low`, `medium`, `high`, `critical`).

#### `TicketDetailResponse`
```json
{
  "id": 4,
  "title": "VPN connection drops every 10 minutes",
  "description": "After upgrading to macOS Sequoia, my Cisco VPN client drops connection repeatedly.",
  "status": "open",
  "priority": "high",
  "creator_id": 5,
  "assigned_engineer_id": null,
  "category": {
    "id": 3,
    "name": "Network & VPN"
  },
  "department": {
    "id": 1,
    "name": "IT Infrastructure"
  },
  "sla_due_at": "2026-07-30T12:00:00Z",
  "created_at": "2026-07-30T08:00:00Z",
  "updated_at": "2026-07-30T08:00:00Z"
}
```

---

### 2.3. Comment & Attachment Models

#### `CommentCreate` (POST `/api/v1/tickets/{id}/comments`)
```json
{
  "content": "Assigned engineer to check router firewall routing logs.",
  "is_internal": true
}
```
* **Validation**:
  - `content`: String, min length 1.
  - `is_internal`: Boolean. Defaults to `false` (meaning public to creator). Help Desk Officers and Engineers can toggle `true` for internal workspace notes.

---

## 3. Secure File Upload Validation Specifications
When files are uploaded via `/api/v1/tickets/{id}/upload`:
1. **Size Validation**: The server checks the `Content-Length` header. Uploads exceeding **10MB** are rejected with `413 Payload Too Large`.
2. **MIME-Type Validation (Allowed Lists)**:
   - Images: `image/jpeg`, `image/png`, `image/webp`.
   - Documents: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), `text/plain` (TXT), `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX).
   - Archive formats and executable extensions (e.g. `.exe`, `.bat`, `.sh`) are strictly blocked.
3. **Storage Sync**: Path files are dynamically stored on AWS S3 using hashed names to prevent Directory Traversal attacks.

---

## 4. Error Handling and API Standards
All error responses adhere to a consistent structured schema:

```json
{
  "detail": {
    "code": "ERROR_CODE_STRING",
    "message": "Human-readable explanation of error.",
    "field": "Optional field name where validation failed"
  }
}
```

### Standard HTTP Status Codes Used:
* **`400 Bad Request`**: Incorrect inputs, bad query filters, or illegal transitions (e.g., trying to close a ticket that is already closed).
* **`401 Unauthorized`**: Expired/missing JWT token, invalid signature.
* **`403 Forbidden`**: RBAC permissions failure (e.g., Employee trying to assign a ticket).
* **`404 Not Found`**: Target resource (user, ticket, comment) does not exist.
* **`422 Unprocessable Entity`**: Pydantic input validation failure (returns validation mismatch).
* **`500 Internal Server Error`**: Database outage or server failure.
