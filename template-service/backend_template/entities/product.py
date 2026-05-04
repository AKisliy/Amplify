from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


VALID_PLATFORMS = ("tiktok-shop", "shopify", "amazon")


# -----------------------------------------------------------------------------
# ProductImage
# -----------------------------------------------------------------------------

class ProductImageCreate(BaseModel):
    media_uuid: UUID


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    media_uuid: UUID
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# ProductStoreLink
# -----------------------------------------------------------------------------

class ProductStoreLinkCreate(BaseModel):
    platform: str = Field(..., description=f"One of: {', '.join(VALID_PLATFORMS)}")
    url: str = Field(..., min_length=1)


class ProductStoreLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    url: str
    created_at: datetime
    updated_at: datetime


# -----------------------------------------------------------------------------
# Product
# -----------------------------------------------------------------------------

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(
        default=None,
        description="Product description — injected into generation prompts.",
    )
    brand_id: UUID | None = Field(
        default=None,
        description="Optional reference to a Brand.",
    )


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    """All fields optional for PATCH semantics."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)
    brand_id: UUID | None = Field(default=None)


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    images: list[ProductImageResponse] = []
    store_links: list[ProductStoreLinkResponse] = []
    created_at: datetime
    updated_at: datetime


__all__ = [
    "ProductImageCreate", "ProductImageResponse",
    "ProductStoreLinkCreate", "ProductStoreLinkResponse",
    "ProductCreate", "ProductUpdate", "ProductResponse",
    "VALID_PLATFORMS",
]
