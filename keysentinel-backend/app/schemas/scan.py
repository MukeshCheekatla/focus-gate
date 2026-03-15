from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from typing import Any


class ScanRequest(BaseModel):
    project_id: uuid.UUID
    repo: str = Field(..., min_length=1, description="GitHub repo in owner/repo format")


class ScanFinding(BaseModel):
    file: str
    line: int
    pattern_name: str
    matched_text: str  # redacted/truncated for display
    commit_sha: str | None = None


class ScanResultOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    repo: str
    findings: list[Any]
    scanned_at: datetime

    model_config = {"from_attributes": True}
