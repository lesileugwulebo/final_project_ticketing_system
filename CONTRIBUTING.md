# Contributing Guidelines

Thank you for contributing to the Verdad Tickets project. As an academic MIT Professional Master's Project, maintaining strict code standards and documentation consistency is essential for portfolio presentation.

---

## 📜 Coding Guidelines
* **Python Backend**:
  - Follow PEP 8 guidelines.
  - Document public endpoints and functions with clear docstrings.
  - Validate all data structures using Pydantic models.
  - Expose no raw SQL; all queries must use SQLAlchemy ORM wrappers.
* **React Frontend**:
  - Maintain reusable components.
  - Use Tailwind CSS tokens, avoiding inline raw style values.
  - Manage state logically using React Context API.

---

## 🌿 Git Workflow & Commits
* **Branch Names**:
  - Features: `feature/ticket-management`, `feature/auth-argon2`
  - Disaster Recovery: `dr/gcp-failover`
  - Documentation: `docs/system-design`
* **Commit Messages**:
  - Write descriptive, imperatively-phrased commit subjects (e.g., `Add Argon2id password hashing to auth schemas`).
  - Keep each commit scope limited to a single feature or phase.
