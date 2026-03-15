from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.database import get_db
from app.models.api_key import ApiKey
from app.models.rotation_event import RotationEvent
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.api_key import (
    ApiKeyCreate, ApiKeyUpdate, ApiKeyOut, ApiKeyWithValue,
    RotationEventCreate, RotationEventOut
)
from app.services.encryption import encrypt_value, decrypt_value
from app.middleware.auth import get_current_user
import uuid

router = APIRouter(prefix="/projects/{project_id}/keys", tags=["keys"])


async def assert_project_access(project_id: uuid.UUID, user: User, db: AsyncSession, require_editor: bool = False) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if project.owner_id == user.id:
        return project
    member_result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user.id,
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if require_editor and member.role == "viewer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Editor or owner role required")
    return project


def compute_status(key: ApiKey) -> str:
    """Compute the current status of a key based on expiry."""
    if key.status in ("leaked", "rotated"):
        return key.status
    now = datetime.now(timezone.utc)
    if key.expires_at:
        expires = key.expires_at.replace(tzinfo=timezone.utc) if key.expires_at.tzinfo is None else key.expires_at
        days_to_expiry = (expires - now).days
        if days_to_expiry < 0:
            return "expired"
        if days_to_expiry <= key.rotation_reminder_days:
            return "expiring"
    return "active"


@router.post("/", response_model=ApiKeyOut, status_code=status.HTTP_201_CREATED)
async def create_key(
    project_id: uuid.UUID,
    body: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKey:
    await assert_project_access(project_id, current_user, db, require_editor=True)
    encrypted = encrypt_value(body.value)
    now = datetime.now(timezone.utc)
    key = ApiKey(
        id=uuid.uuid4(),
        project_id=project_id,
        created_by=current_user.id,
        name=body.name,
        service=body.service,
        encrypted_value=encrypted,
        tags=body.tags or [],
        expires_at=body.expires_at,
        rotation_reminder_days=body.rotation_reminder_days,
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(key)
    await db.flush()
    key.status = compute_status(key)
    return key


@router.get("/", response_model=list[ApiKeyOut])
async def list_keys(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ApiKey]:
    await assert_project_access(project_id, current_user, db)
    result = await db.execute(select(ApiKey).where(ApiKey.project_id == project_id))
    keys = result.scalars().all()
    for key in keys:
        key.status = compute_status(key)
    return list(keys)


@router.get("/{key_id}", response_model=ApiKeyWithValue)
async def get_key(
    project_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    await assert_project_access(project_id, current_user, db)
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.project_id == project_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    key.status = compute_status(key)
    decrypted = decrypt_value(key.encrypted_value)
    return {**key.__dict__, "decrypted_value": decrypted}


@router.patch("/{key_id}", response_model=ApiKeyOut)
async def update_key(
    project_id: uuid.UUID,
    key_id: uuid.UUID,
    body: ApiKeyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiKey:
    await assert_project_access(project_id, current_user, db, require_editor=True)
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.project_id == project_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    if body.name is not None:
        key.name = body.name
    if body.service is not None:
        key.service = body.service
    if body.tags is not None:
        key.tags = body.tags
    if body.expires_at is not None:
        key.expires_at = body.expires_at
    if body.rotation_reminder_days is not None:
        key.rotation_reminder_days = body.rotation_reminder_days
    if body.status is not None:
        key.status = body.status
    await db.flush()
    key.status = compute_status(key)
    return key


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(
    project_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    await assert_project_access(project_id, current_user, db, require_editor=True)
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.project_id == project_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")
    await db.delete(key)


@router.post("/{key_id}/rotate", response_model=RotationEventOut, status_code=status.HTTP_201_CREATED)
async def rotate_key(
    project_id: uuid.UUID,
    key_id: uuid.UUID,
    body: RotationEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> RotationEvent:
    await assert_project_access(project_id, current_user, db, require_editor=True)
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id, ApiKey.project_id == project_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Key not found")

    # Encrypt and store the new key value
    key.encrypted_value = encrypt_value(body.new_value)
    key.last_rotated_at = datetime.now(timezone.utc)
    key.status = "active"

    now = datetime.now(timezone.utc)
    event = RotationEvent(
        id=uuid.uuid4(),
        key_id=key.id,
        rotated_by=current_user.id,
        notes=body.notes,
        rotated_at=now,
    )
    db.add(event)
    await db.flush()
    return event


@router.get("/{key_id}/history", response_model=list[RotationEventOut])
async def get_rotation_history(
    project_id: uuid.UUID,
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RotationEvent]:
    await assert_project_access(project_id, current_user, db)
    result = await db.execute(
        select(RotationEvent).where(RotationEvent.key_id == key_id).order_by(RotationEvent.rotated_at.desc())
    )
    return list(result.scalars().all())
