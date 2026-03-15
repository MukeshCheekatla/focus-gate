import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from app.main import app
from app.database import get_db
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
import uuid


TEST_USER_EMAIL = "test@keysentinel.dev"
TEST_USER_PASSWORD = "securepassword123"


@pytest.fixture
def mock_user() -> User:
    user = User()
    user.id = uuid.uuid4()
    user.email = TEST_USER_EMAIL
    user.hashed_password = "$2b$12$hashedpassword"
    user.github_token = None
    from datetime import datetime, timezone
    user.created_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)
    return user


@pytest.fixture
def mock_db(mock_user):
    db = AsyncMock(spec=AsyncSession)

    # Mock execute to return None (no existing user) for register
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=mock_result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_register_success(mock_db):
    """Test successful user registration."""
    app.dependency_overrides[get_db] = lambda: mock_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == TEST_USER_EMAIL
    assert "id" in data
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(mock_db, mock_user):
    """Test registration with an already-used email returns 400."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_db.execute = AsyncMock(return_value=mock_result)
    app.dependency_overrides[get_db] = lambda: mock_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_invalid_credentials(mock_db):
    """Test login with wrong credentials returns 401."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    app.dependency_overrides[get_db] = lambda: mock_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpassword"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_unauthenticated():
    """Test /me without token returns 401 or 403 (depends on FastAPI/Starlette version)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_register_weak_password(mock_db):
    """Test registration with a too-short password returns 422."""
    app.dependency_overrides[get_db] = lambda: mock_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "user@example.com", "password": "short"},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 422
