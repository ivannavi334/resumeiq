"""
Tests for /api/v1/auth/* endpoints (auth router + auth_service + security utils).
"""
import pytest
from app.utils.security import create_access_token, create_refresh_token


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

def test_register_success(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "newuser@example.com",
        "password": "securepassword123",
        "full_name": "New User",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["full_name"] == "New User"
    assert "id" in data
    assert "hashed_password" not in data


def test_register_minimal_fields(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "minimal@example.com",
        "password": "password123",
    })
    assert response.status_code == 201
    assert response.json()["full_name"] is None


def test_register_duplicate_email(client, test_user):
    response = client.post("/api/v1/auth/register", json={
        "email": "testuser@example.com",  # same as test_user
        "password": "anotherpassword",
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_register_invalid_email(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "not-an-email",
        "password": "password123",
    })
    assert response.status_code == 422


def test_register_missing_password(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "user@example.com",
    })
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

def test_login_success(client, test_user):
    response = client.post("/api/v1/auth/login", data={
        "username": "testuser@example.com",
        "password": "testpassword123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client, test_user):
    response = client.post("/api/v1/auth/login", data={
        "username": "testuser@example.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post("/api/v1/auth/login", data={
        "username": "nobody@example.com",
        "password": "password123",
    })
    assert response.status_code == 401


def test_login_inactive_user(client, inactive_user):
    response = client.post("/api/v1/auth/login", data={
        "username": "inactive@example.com",
        "password": "testpassword123",
    })
    assert response.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

def test_get_me_success(client, test_user, auth_headers):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert data["full_name"] == "Test User"
    assert data["plan"] == "free"
    assert "id" in data


def test_get_me_unauthenticated(client):
    # HTTPBearer returns 403 when Authorization header is missing
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403


def test_get_me_invalid_token(client):
    response = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/auth/refresh
# ---------------------------------------------------------------------------

def test_refresh_token_success(client, test_user):
    login_resp = client.post("/api/v1/auth/login", data={
        "username": "testuser@example.com",
        "password": "testpassword123",
    })
    refresh_token = login_resp.json()["refresh_token"]

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_token_invalid_string(client):
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": "totally.invalid.token"})
    assert response.status_code == 401


def test_refresh_token_using_access_token(client, test_user):
    # Access tokens have type="access", not "refresh" — must be rejected
    access_token = create_access_token({"sub": str(test_user.id)})
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/auth/change-password
# ---------------------------------------------------------------------------

def test_change_password_success(client, test_user, auth_headers):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "testpassword123", "new_password": "newpassword456"},
        headers=auth_headers,
    )
    assert response.status_code == 204


def test_change_password_wrong_current(client, test_user, auth_headers):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword", "new_password": "newpassword456"},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "Incorrect" in response.json()["detail"]


def test_change_password_unauthenticated(client):
    response = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "testpassword123", "new_password": "newpassword456"},
    )
    assert response.status_code == 403
