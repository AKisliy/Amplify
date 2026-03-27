import aiohttp
from fastapi import HTTPException, status

from backend_template.config import settings
from backend_template.entities.engine import HistoryEntry, PromptRequest, PromptResponse


class EngineClientService:
    """
    Async HTTP client for the engine.
    Proxies requests from the FastAPI gateway to the internal aiohttp engine.
    """

    # ── Node Info ─────────────────────────────────────────────────────────

    async def get_all_node_info(self) -> dict:
        """Proxy GET /api/object_info → all registered node schemas."""
        return await self._get(f"{settings.engine_base_url}/api/object_info")

    async def get_node_info(self, node_class: str) -> dict:
        """Proxy GET /api/object_info/{node_class} → single node schema."""
        return await self._get(
            f"{settings.engine_base_url}/api/object_info/{node_class}"
        )

    # ── History ───────────────────────────────────────────────────────────

    async def get_prompt_history(self, prompt_id: str) -> HistoryEntry | None:
        """Proxy GET /api/history/{prompt_id} → single prompt history."""
        data = await self._get(
            f"{settings.engine_base_url}/api/history/{prompt_id}"
        )
        if not data:
            return None
        entry = next(iter(data.values()))
        return HistoryEntry.model_validate(entry)

    async def get_all_history(
        self,
        max_items: int | None = None,
        offset: int | None = None,
    ) -> list[HistoryEntry]:
        """Proxy GET /api/history → all prompt history (paginated)."""
        params: dict = {}
        if max_items is not None:
            params["max_items"] = max_items
        if offset is not None:
            params["offset"] = offset
        data = await self._get(
            f"{settings.engine_base_url}/api/history", params=params
        )
        return [HistoryEntry.model_validate(v) for v in data.values()]

    async def clear_history(
        self,
        clear: bool | None = None,
        delete: list[str] | None = None,
    ) -> None:
        """Proxy POST /api/history → clear/delete history entries."""
        body: dict = {}
        if clear is not None:
            body["clear"] = clear
        if delete is not None:
            body["delete"] = delete
        await self._post(
            f"{settings.engine_base_url}/api/history", json=body
        )

    # ── Prompt Submission ─────────────────────────────────────────────────

    async def submit_prompt(self, payload: PromptRequest) -> PromptResponse:
        """Proxy POST /api/prompt → submit workflow for execution."""
        data = await self._post_json(
            f"{settings.engine_base_url}/api/prompt",
            json=payload.model_dump(exclude_none=True),
        )
        return PromptResponse.model_validate(data)

    # ── Private Helpers ───────────────────────────────────────────────────

    async def _get(self, url: str, params: dict | None = None) -> dict:
        """Shared GET helper with connection error handling."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url, params=params, timeout=aiohttp.ClientTimeout(total=10)
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

    async def _post(self, url: str, json: dict | None = None) -> None:
        """Shared POST helper (void) with connection error handling."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=json, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status >= 400:
                        text = await resp.text()
                        raise HTTPException(status_code=resp.status, detail=text)
        except aiohttp.ClientConnectorError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Engine is not available",
            )

    async def _post_json(self, url: str, json: dict | None = None) -> dict:
        """POST helper that returns JSON response. Forwards structured engine errors."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url, json=json, timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    body = await resp.json()
                    if resp.status >= 400:
                        raise HTTPException(status_code=resp.status, detail=body)
                    return body
        except aiohttp.ClientConnectorError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Engine is not available",
            )
