"""
Dedicated async engine for the ComfyUI worker thread.

The main ``backend_template.database`` engine is created at FastAPI startup and
its connection pool is bound to the FastAPI event loop.  The engine worker
thread creates its own persistent event loop (via ``asyncio.new_event_loop()``
in ``prompt_worker``), so sharing the FastAPI engine would cause
"Future attached to a different loop" errors.

This module lazily creates a separate ``create_async_engine`` the first time a
node calls ``engine_session_maker()``.  Because the worker loop is persistent
(one loop for the lifetime of the thread), the engine is created once and its
connection pool is reused across all prompt executions.
"""

from __future__ import annotations

import uuid

from asyncpg import Connection as AsyncPGConnection
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend_template.config import settings


# Reuse the prepared-statement collision fix from the main database module.
class _FixedAsyncConnection(AsyncPGConnection):
    def _get_unique_id(self, prefix: str) -> str:
        return f"__asyncpg_{prefix}_{uuid.uuid4()}__"


_engine = None
_session_maker = None


def engine_session_maker() -> AsyncSession:
    """Return an ``AsyncSession`` context manager bound to the worker loop.

    Lazily creates a dedicated engine on first call.  Since the worker thread
    uses a persistent event loop, the engine is created once and its pool is
    reused across all prompt executions.

    Usage inside nodes::

        from backend_template.engine.database import engine_session_maker

        async with engine_session_maker() as session:
            ...
    """
    global _engine, _session_maker

    if _session_maker is None:
        _engine = create_async_engine(
            url=settings.postgres_dsn,
            echo=settings.postgres_echo,
            connect_args={"connection_class": _FixedAsyncConnection},
            pool_pre_ping=True,
            pool_size=3,
            max_overflow=5,
        )
        _session_maker = async_sessionmaker(
            _engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    return _session_maker()
