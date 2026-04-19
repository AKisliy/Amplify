from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# 1. Base (Shared Contract)
# -----------------------------------------------------------------------------
class BrandBase(BaseModel):
    """
    Shared fields for Brand — used in both creation and response.
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Display name of the brand.",
    )

    description: str | None = Field(
        default=None,
        description="The 'spirit' of the brand — used for prompt injection via {{brand_description}}.",
    )

    logo_image_uuid: UUID | None = Field(
        default=None,
        description="Reference to the brand's logo asset in media-ingest.",
    )


# -----------------------------------------------------------------------------
# 2. Create (Input)
# -----------------------------------------------------------------------------
class BrandCreate(BrandBase):
    """Fields required to create a new Brand."""
    pass


# -----------------------------------------------------------------------------
# 3. Update (Partial PATCH)
# -----------------------------------------------------------------------------
class BrandUpdate(BaseModel):
    """
    All fields optional for PATCH semantics.
    Inherits from BaseModel (NOT BrandBase) to make all fields optional.
    """
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)
    logo_image_uuid: UUID | None = Field(default=None)


# -----------------------------------------------------------------------------
# 4. Response (Output)
# -----------------------------------------------------------------------------
class BrandResponse(BrandBase):
    """Full Brand representation returned to the client."""
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
