from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class AlertConfigCreate(BaseModel):
    type: str = Field(..., pattern="^(email|slack|webhook)$")
    endpoint: str = Field(..., min_length=1, max_length=1024)
    enabled: bool = True


class AlertConfigUpdate(BaseModel):
    endpoint: str | None = Field(None, min_length=1, max_length=1024)
    enabled: bool | None = None


class AlertConfigOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    endpoint: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertTestRequest(BaseModel):
    alert_config_id: uuid.UUID
