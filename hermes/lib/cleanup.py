"""
Hermes cleanup module.
Deletes test records via the TDental API after each flow.
"""

import logging
from typing import Any

import httpx

logger = logging.getLogger("hermes")

# API endpoints for each entity type
ENTITY_ENDPOINTS = {
    "customer": "/api/partners",
    "service": "/api/products",
    "appointment": "/api/appointments",
    "payment": "/api/payments",
}


async def get_auth_token(base_url: str, email: str, password: str) -> str:
    """Authenticate and get a JWT token."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{base_url}/api/Auth/login",
            json={"email": email, "password": password},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("token", "")


async def find_test_records(
    base_url: str,
    token: str,
    entity: str,
    prefix: str = "HERMES_",
) -> list[dict[str, Any]]:
    """Find all test records matching the prefix."""
    endpoint = ENTITY_ENDPOINTS.get(entity)
    if not endpoint:
        logger.warning(f"Unknown entity type: {entity}")
        return []

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{base_url}{endpoint}", headers=headers)
        resp.raise_for_status()
        records = resp.json()

        # Filter for test records
        return [
            r for r in records
            if any(
                str(v).startswith(prefix)
                for k, v in r.items()
                if isinstance(v, str) and k in ("name", "title", "partner_name")
            )
        ]


async def delete_test_records(
    base_url: str,
    token: str,
    entity: str,
    records: list[dict[str, Any]],
) -> int:
    """Delete test records by ID. Returns count deleted."""
    endpoint = ENTITY_ENDPOINTS.get(entity)
    if not endpoint:
        return 0

    headers = {"Authorization": f"Bearer {token}"}
    deleted = 0

    async with httpx.AsyncClient(timeout=30.0) as client:
        for record in records:
            record_id = record.get("id")
            if not record_id:
                continue
            try:
                resp = await client.delete(
                    f"{base_url}{endpoint}/{record_id}",
                    headers=headers,
                )
                if resp.status_code in (200, 204):
                    deleted += 1
                else:
                    logger.warning(
                        f"Failed to delete {entity}/{record_id}: {resp.status_code}"
                    )
            except Exception as e:
                logger.error(f"Delete error for {entity}/{record_id}: {e}")

    return deleted


async def cleanup_flow(
    base_url: str,
    token: str,
    entity: str,
    prefix: str = "HERMES_",
) -> int:
    """Find and delete all test records for a flow. Returns count deleted."""
    records = await find_test_records(base_url, token, entity, prefix)
    if not records:
        logger.info(f"No {entity} test records to clean up")
        return 0

    deleted = await delete_test_records(base_url, token, entity, records)
    logger.info(f"Cleaned up {deleted}/{len(records)} {entity} test records")
    return deleted
