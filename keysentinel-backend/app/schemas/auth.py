from pydantic import BaseModel, EmailStr, Field
import uuid
from datetime import datetime


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: uuid.UUID


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    github_token: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
