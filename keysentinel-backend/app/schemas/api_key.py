from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from typing import Any


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    service: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1)  # plaintext -- encrypted before storage
    tags: list[str] | None = None
    expires_at: datetime | None = None
    rotation_reminder_days: int = Field(30, ge=1, le=365)


class ApiKeyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    service: str | None = Field(None, min_length=1, max_length=255)
    tags: list[str] | None = None
    expires_at: datetime | None = None
    rotation_reminder_days: int | None = Field(None, ge=1, le=365)
    status: str | None = None


class ApiKeyOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    created_by: uuid.UUID | None
    name: str
    service: str
    status: str
    tags: list[Any] | None
    expires_at: datetime | None
    rotation_reminder_days: int
    last_rotated_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyWithValue(ApiKeyOut):
    """Includes decrypted value -- only returned on explicit fetch."""
    decrypted_value: str


class RotationEventCreate(BaseModel):
    notes: str | None = None
    new_value: str = Field(..., min_length=1)  # new plaintext key value


class RotationEventOut(BaseModel):
    id: uuid.UUID
    key_id: uuid.UUID
    rotated_by: uuid.UUID | None
    notes: str | None
    rotated_at: datetime

    model_config = {"from_attributes": True}
