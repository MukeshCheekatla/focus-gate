from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.api_key import ApiKey
from app.models.rotation_event import RotationEvent
from typing import Any
import uuid


KEY_AGE_THRESHOLD_DAYS = 90


async def compute_audit_report(project_id: uuid.UUID, db: AsyncSession) -> dict[str, Any]:
    """Generate a full audit report for a project's API keys."""
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(ApiKey).where(ApiKey.project_id == project_id)
    )
    keys: list[ApiKey] = result.scalars().all()

    unused_keys: list[dict] = []
    over_aged_keys: list[dict] = []
    no_rotation_policy_keys: list[dict] = []
    expiring_soon_keys: list[dict] = []
    expired_keys: list[dict] = []

    seen_values: dict[str, list[str]] = {}

    for key in keys:
        key_info = {"id": str(key.id), "name": key.name, "service": key.service}

        # Over-aged: created more than 90 days ago and never rotated
        age_days = (now - key.created_at.replace(tzinfo=timezone.utc)).days
        last_activity = key.last_rotated_at or key.created_at
        days_since_activity = (now - last_activity.replace(tzinfo=timezone.utc)).days
        if days_since_activity > KEY_AGE_THRESHOLD_DAYS:
            over_aged_keys.append({**key_info, "days_since_last_rotation": days_since_activity})

        # No rotation policy: rotation_reminder_days is very large (> 180) or no expires_at
        if key.rotation_reminder_days > 180 and key.expires_at is None:
            no_rotation_policy_keys.append(key_info)

        # Expiring soon: expires within rotation_reminder_days
        if key.expires_at:
            days_to_expiry = (key.expires_at.replace(tzinfo=timezone.utc) - now).days
            if days_to_expiry < 0:
                expired_keys.append({**key_info, "expired_days_ago": abs(days_to_expiry)})
            elif days_to_expiry <= key.rotation_reminder_days:
                expiring_soon_keys.append({**key_info, "days_to_expiry": days_to_expiry})

        # Track duplicates by encrypted_value hash (compare encrypted values)
        val = key.encrypted_value
        if val not in seen_values:
            seen_values[val] = []
        seen_values[val].append(key.name)

    duplicate_keys = [
        {"names": names, "count": len(names)}
        for val, names in seen_values.items()
        if len(names) > 1
    ]

    # Compute health score (0-100)
    total = len(keys)
    issues = len(over_aged_keys) + len(no_rotation_policy_keys) + len(expired_keys) + len(duplicate_keys)
    score = max(0, 100 - int((issues / max(total, 1)) * 100)) if total > 0 else 100

    return {
        "project_id": str(project_id),
        "total_keys": total,
        "health_score": score,
        "over_aged_keys": over_aged_keys,
        "no_rotation_policy_keys": no_rotation_policy_keys,
        "expiring_soon_keys": expiring_soon_keys,
        "expired_keys": expired_keys,
        "duplicate_keys": duplicate_keys,
        "generated_at": now.isoformat(),
    }


async def compute_global_audit(user_id: uuid.UUID, db: AsyncSession) -> dict[str, Any]:
    """Generate a global audit report across all projects owned by the user."""
    from app.models.project import Project

    result = await db.execute(
        select(Project).where(Project.owner_id == user_id)
    )
    projects = result.scalars().all()

    all_reports = []
    for project in projects:
        report = await compute_audit_report(project.id, db)
        report["project_name"] = project.name
        all_reports.append(report)

    total_keys = sum(r["total_keys"] for r in all_reports)
    avg_score = (
        int(sum(r["health_score"] for r in all_reports) / len(all_reports))
        if all_reports else 100
    )

    return {
        "user_id": str(user_id),
        "total_projects": len(projects),
        "total_keys": total_keys,
        "average_health_score": avg_score,
        "projects": all_reports,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
