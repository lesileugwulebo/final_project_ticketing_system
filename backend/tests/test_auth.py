import pytest
from app.core.security import hash_password
from app.models.models import User, UserRole

def seed_test_user(db):
    """Utility to seed a sample test user"""
    user = User(
        email="testuser@verdad.com",
        hashed_password=hash_password("password123"),
        full_name="Terry Test",
        role=UserRole.EMPLOYEE,
        is_active=True
    )
    db.add(user)
    db.commit()
    return user

def test_login_success(client, db_session):
    """Test successful login checks"""
    seed_test_user(db_session)
    
    # Send form request data
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testuser@verdad.com", "password": "password123"}
    )
    assert response.status_code == 200
    json_data = response.json()
    assert "access_token" in json_data
    assert json_data["token_type"] == "bearer"
    assert "refresh_token" in response.cookies

def test_login_incorrect_password(client, db_session):
    """Test login fails with incorrect password validation"""
    seed_test_user(db_session)
    
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "testuser@verdad.com", "password": "wrongpassword"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

def test_login_unknown_user(client, db_session):
    """Test login fails with unregistered email"""
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "unknown@verdad.com", "password": "password123"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect email or password"

def test_logout(client):
    """Test logout clears authorization cookies"""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["detail"] == "Successfully logged out"
