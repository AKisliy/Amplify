"""
Node result cache for Temporal activities.

Write:  every run, unconditionally (if cache_enabled=True in config).
Read:   only when NodeActivityInput.can_use_cache=True (set via UI cache zone).

The cache is initialised once at worker startup via init_cache().
Activities call get_cached() / set_cached() directly — no DI needed.
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from backend_template.models.node_result_cache import NodeResultCache

logger = logging.getLogger(__name__)

_DEFAULT_TTL_DAYS = 7

# ---------------------------------------------------------------------------
# Module-level singleton — set by init_cache() at worker startup
# ---------------------------------------------------------------------------
_session_maker: async_sessionmaker[AsyncSession] | None = None


def init_cache(session_maker: async_sessionmaker[AsyncSession]) -> None:
    """Call once at worker startup before processing any tasks."""
    global _session_maker
    _session_maker = session_maker
    logger.info("Node result cache initialised (PostgreSQL)")


# ---------------------------------------------------------------------------
# Cache key
# ---------------------------------------------------------------------------

def compute_cache_key(class_type: str, resolved: dict) -> str:
    """
    Deterministic SHA-256 key from (class_type, resolved inputs).

    resolved contains concrete values at this point (links already resolved
    by the workflow), so no graph traversal is needed.
    default=str handles any non-JSON-serialisable edge cases safely.
    """
    payload = json.dumps(
        {"class_type": class_type, "inputs": resolved},
        sort_keys=True,
        ensure_ascii=False,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Read / write
# ---------------------------------------------------------------------------

async def get_cached(key: str) -> dict | None:
    """Return cached output dict, or None on miss / uninitialised cache."""
    if _session_maker is None:
        return None
    async with _session_maker() as session:
        row = await session.get(NodeResultCache, key)
        if row is None:
            return None
        if row.expires_at < datetime.now(tz=timezone.utc):
            # Expired — treat as miss; background cleanup will remove it later
            return None
        return row.output


async def set_cached(
    key: str,
    class_type: str,
    value: dict,
    ttl_days: int = _DEFAULT_TTL_DAYS,
) -> None:
    """Upsert a cache entry. Silently skips if cache is uninitialised."""
    if _session_maker is None:
        return
    expires_at = datetime.now(tz=timezone.utc) + timedelta(days=ttl_days)
    async with _session_maker() as session:
        stmt = (
            insert(NodeResultCache)
            .values(
                input_hash=key,
                class_type=class_type,
                output=value,
                expires_at=expires_at,
            )
            .on_conflict_do_update(
                index_elements=["input_hash"],
                set_={"output": value, "expires_at": expires_at},
            )
        )
        await session.execute(stmt)
        await session.commit()


async def purge_expired() -> int:
    """Delete expired entries. Intended for periodic maintenance jobs."""
    if _session_maker is None:
        return 0
    async with _session_maker() as session:
        result = await session.execute(
            delete(NodeResultCache).where(
                NodeResultCache.expires_at < datetime.now(tz=timezone.utc)
            )
        )
        await session.commit()
        return result.rowcount
