import logging
from typing import Annotated

import aiohttp
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt.algorithms import RSAAlgorithm

from backend_template.config import auth_config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# JWKS cache — fetched once on first request, refreshed on verification error
# ---------------------------------------------------------------------------

_jwks: dict | None = None


async def _fetch_jwks() -> dict:
    global _jwks
    openid_url = f"{auth_config.userservice_url}/auth/.well-known/openid-configuration"
    async with aiohttp.ClientSession() as session:
        async with session.get(openid_url) as resp:
            resp.raise_for_status()
            config = await resp.json()
        async with session.get(config["jwks_uri"]) as resp:
            resp.raise_for_status()
            _jwks = await resp.json()
    return _jwks


async def _get_jwks() -> dict:
    if _jwks is None:
        return await _fetch_jwks()
    return _jwks


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def _get_user_id(authorization: str = Header(alias="Authorization")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing Bearer token")
    token = authorization[7:]

    jwks = await _get_jwks()
    last_exc: Exception | None = None

    for key_data in jwks.get("keys", []):
        try:
            public_key = RSAAlgorithm.from_jwk(key_data)
            payload = jwt.decode(
                token,
                public_key,
                algorithms=["RS256"],
                audience=auth_config.jwt_audience,
            )
            user_id: str | None = payload.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
            if not user_id:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim")
            return user_id
        except jwt.ExpiredSignatureError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except jwt.InvalidTokenError as e:
            last_exc = e
            continue

    # If all keys failed, try refreshing JWKS once and retry
    global _jwks
    _jwks = None
    try:
        jwks = await _fetch_jwks()
        for key_data in jwks.get("keys", []):
            try:
                public_key = RSAAlgorithm.from_jwk(key_data)
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    audience=auth_config.jwt_audience,
                )
                user_id = payload.get("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")
                if not user_id:
                    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim")
                return user_id
            except jwt.ExpiredSignatureError:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Token expired")
            except jwt.InvalidTokenError as e:
                last_exc = e
                continue
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to refresh JWKS: {e}")

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {last_exc}")


CurrentUserId = Annotated[str, Depends(_get_user_id)]
