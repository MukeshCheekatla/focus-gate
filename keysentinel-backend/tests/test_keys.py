import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.api_key import ApiKey
from app.models.project import Project
from app.models.rotation_event import RotationEvent
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime, timezone


def make_project(owner_id: uuid.UUID) -> Project:
    p = Project()
    p.id = uuid.uuid4()
    p.owner_id = owner_id
    p.name = "Test Project"
    p.description = None
    p.created_at = datetime.now(timezone.utc)
    p.updated_at = datetime.now(timezone.utc)
    return p


def make_key(project_id: uuid.UUID, created_by: uuid.UUID) -> ApiKey:
    k = ApiKey()
    k.id = uuid.uuid4()
    k.project_id = project_id
    k.created_by = created_by
    k.name = "OpenAI Key"
    k.service = "OpenAI"
    k.encrypted_value = "gAAAAAtest_encrypted_value=="
    k.status = "active"
    k.tags = ["ai", "prod"]
    k.expires_at = None
    k.rotation_reminder_days = 30
    k.last_rotated_at = None
    k.created_at = datetime.now(timezone.utc)
    k.updated_at = datetime.now(timezone.utc)
    return k


@pytest.fixture
def user_id() -> uuid.UUID:
    return uuid.uuid4()


@pytest.fixture
def mock_user(user_id):
    from app.models.user import User
    u = User()
    u.id = user_id
    u.email = "dev@keysentinel.dev"
    u.hashed_password = "hashed"
    u.github_token = None
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = datetime.now(timezone.utc)
    return u


@pytest.fixture
def mock_db():
    db = AsyncMock(spec=AsyncSession)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.rollback = AsyncMock()
    db.close = AsyncMock()
    db.delete = AsyncMock()
    return db


@pytest.mark.asyncio
async def test_list_keys_empty(mock_db, mock_user, user_id):
    """List keys returns empty list when no keys exist."""
    project = make_project(user_id)

    # First call: get project; second call: list keys
    project_result = MagicMock()
    project_result.scalar_one_or_none.return_value = project
    keys_result = MagicMock()
    keys_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(side_effect=[project_result, keys_result])

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(f"/api/v1/projects/{project.id}/keys/")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_key(mock_db, mock_user, user_id):
    """Create a new API key with encrypted storage."""
    project = make_project(user_id)

    project_result = MagicMock()
    project_result.scalar_one_or_none.return_value = project
    mock_db.execute = AsyncMock(return_value=project_result)

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    with patch("app.routers.keys.encrypt_value", return_value="encrypted_test_value"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/projects/{project.id}/keys/",
                json={
                    "name": "Stripe Key",
                    "service": "Stripe",
                    "value": "sk_live_testkey123",
                    "tags": ["payments"],
                    "rotation_reminder_days": 30,
                },
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Stripe Key"
    assert data["service"] == "Stripe"
    assert "decrypted_value" not in data  # Must not leak plain value


@pytest.mark.asyncio
async def test_rotate_key(mock_db, mock_user, user_id):
    """Rotate a key records a rotation event."""
    project = make_project(user_id)
    key = make_key(project.id, user_id)

    project_result = MagicMock()
    project_result.scalar_one_or_none.return_value = project
    key_result = MagicMock()
    key_result.scalar_one_or_none.return_value = key
    mock_db.execute = AsyncMock(side_effect=[project_result, key_result])

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user

    with patch("app.routers.keys.encrypt_value", return_value="new_encrypted_value"):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                f"/api/v1/projects/{project.id}/keys/{key.id}/rotate",
                json={"notes": "Rotated due to quarterly policy", "new_value": "new_key_value_xyz"},
            )

    app.dependency_overrides.clear()
    assert response.status_code == 201
    data = response.json()
    assert data["key_id"] == str(key.id)
    assert data["notes"] == "Rotated due to quarterly policy"
