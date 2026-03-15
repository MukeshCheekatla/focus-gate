from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.alert_config import AlertConfig
from app.models.user import User
from app.schemas.alert import AlertConfigCreate, AlertConfigOut
import uuid

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.post("/", response_model=AlertConfigOut, status_code=status.HTTP_201_CREATED)
async def create_alert_config(
    body: AlertConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertConfig:
    config = AlertConfig(
        id=uuid.uuid4(),
        user_id=current_user.id,
        type=body.type,
        endpoint=body.endpoint,
        enabled=body.enabled,
    )
    db.add(config)
    await db.flush()
    return config


@router.get("/", response_model=list[AlertConfigOut])
async def list_alert_configs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AlertConfig]:
    result = await db.execute(select(AlertConfig).where(AlertConfig.user_id == current_user.id))
    return list(result.scalars().all())


@router.patch("/{config_id}", response_model=AlertConfigOut)
async def update_alert_config(
    config_id: uuid.UUID,
    body: AlertConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AlertConfig:
    result = await db.execute(
        select(AlertConfig).where(AlertConfig.id == config_id, AlertConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert config not found")
    config.type = body.type
    config.endpoint = body.endpoint
    config.enabled = body.enabled
    await db.flush()
    return config


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_config(
    config_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(AlertConfig).where(AlertConfig.id == config_id, AlertConfig.user_id == current_user.id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert config not found")
    await db.delete(config)
