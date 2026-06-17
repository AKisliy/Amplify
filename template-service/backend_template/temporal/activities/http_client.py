"""
Thin aiohttp wrapper for Temporal activities.

Replaces ComfyUI's sync_op/poll_op without pulling in ComfyUI dependencies.
Handles retries on 5xx and 429; no interrupt checking (Temporal manages that
via activity heartbeats).
"""
import asyncio
import json
import logging
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)

_RETRY_STATUSES = {408, 500, 502, 503, 504}


async def http_request(
    method: str,
    url: str,
    *,
    data: dict | None = None,
    headers: dict | None = None,
    params: dict | None = None,
    timeout: float = 3600.0,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    retry_backoff: float = 2.0,
    max_retries_on_rate_limit: int = 16,
) -> dict[str, Any]:
    """Make an HTTP request with retry logic; return parsed JSON."""
    delay = retry_delay
    rl_delay = retry_delay
    attempt = 0
    rl_attempts = 0

    while True:
        attempt += 1
        try:
            timeout_obj = aiohttp.ClientTimeout(total=timeout)
            async with aiohttp.ClientSession(timeout=timeout_obj) as session:
                req_headers: dict[str, str] = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                }
                if headers:
                    req_headers.update(headers)

                kwargs: dict[str, Any] = {"headers": req_headers}
                if params:
                    kwargs["params"] = params
                if data is not None and method.upper() != "GET":
                    kwargs["json"] = data

                async with session.request(method, url, **kwargs) as resp:
                    try:
                        body: Any = await resp.json(content_type=None)
                    except Exception:
                        text = await resp.text()
                        try:
                            body = json.loads(text) if text else {}
                        except json.JSONDecodeError:
                            body = {"_raw": text}

                    if resp.status >= 400:
                        if resp.status == 429 and rl_attempts < max_retries_on_rate_limit:
                            rl_attempts += 1
                            wait = min(rl_delay, 30.0)
                            rl_delay *= retry_backoff
                            logger.warning("Rate limited, waiting %.1fs (attempt %d/%d)", wait, rl_attempts, max_retries_on_rate_limit)
                            await asyncio.sleep(wait)
                            continue
                        retryable = resp.status in _RETRY_STATUSES
                        normal_attempt = attempt - rl_attempts
                        if retryable and normal_attempt <= max_retries:
                            logger.warning("HTTP %d from %s, retrying in %.1fs (%d/%d)", resp.status, url, delay, normal_attempt, max_retries)
                            await asyncio.sleep(delay)
                            delay *= retry_backoff
                            continue
                        raise Exception(f"HTTP {resp.status}: {body}")

                    return body

        except aiohttp.ClientError as e:
            normal_attempt = attempt - rl_attempts
            if normal_attempt <= max_retries:
                logger.warning("Connection error (%s), retrying in %.1fs", e, delay)
                await asyncio.sleep(delay)
                delay *= retry_backoff
                continue
            raise


async def http_post(
    url: str,
    data: dict,
    *,
    headers: dict | None = None,
    timeout: float = 3600.0,
    max_retries: int = 3,
) -> dict[str, Any]:
    return await http_request("POST", url, data=data, headers=headers, timeout=timeout, max_retries=max_retries)


async def http_get(
    url: str,
    *,
    params: dict | None = None,
    headers: dict | None = None,
) -> dict[str, Any]:
    return await http_request("GET", url, params=params, headers=headers)
