import aiohttp
from fastapi import HTTPException, status

from backend_template.config import settings


class EngineClientService:
    """
    Async HTTP client for the engine.
    Proxies requests from the FastAPI gateway to the internal aiohttp engine.
    """

    async def get_all_node_info(self) -> dict:
        """Proxy GET /api/object_info → all registered node schemas."""
        return await self._get(f"{settings.engine_base_url}/api/object_info")

    async def get_node_info(self, node_class: str) -> dict:
        """Proxy GET /api/object_info/{node_class} → single node schema."""
        return await self._get(
            f"{settings.engine_base_url}/api/object_info/{node_class}"
        )

    async def _get(self, url: str) -> dict:
        """Shared GET helper with connection error handling."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status >= 400:
                        text = await resp.text()
                        raise HTTPException(status_code=resp.status, detail=text)
                    return await resp.json()
        except aiohttp.ClientConnectorError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Engine is not available",
            )
