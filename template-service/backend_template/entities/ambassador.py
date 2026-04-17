from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# -----------------------------------------------------------------------------
# Reference Image schemas
# -----------------------------------------------------------------------------

class ReferenceImageCreate(BaseModel):
    media_id: UUID
    image_type: Literal["portrait", "full_body", "other"]


class ReferenceImageResponse(BaseModel):
    id: UUID
    media_id: UUID
    image_type: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Ambassador schemas
# -----------------------------------------------------------------------------

class AmbassadorBase(BaseModel):
    project_id: UUID = Field(..., description="UUID of the parent Project (one-to-one).")
    name: str = Field(..., min_length=1, max_length=255)
    appearance_description: str | None = Field(
        default=None,
        description="Structured text injected into AI prompts (e.g. 'Anna, 25yo, long dark hair...').",
    )
    voice_description: str | None = Field(
        default=None,
        description="Text description used in prompts for video models (make speech more consistent between scenes)"
    )
    voice_id: str | None = Field(
        default=None,
        description="TTS library voice ID (not a text description).",
    )


class AmbassadorCreate(AmbassadorBase):
    pass


class AmbassadorUpdate(BaseModel):
    """All fields optional for PATCH. project_id intentionally omitted."""
    name: str | None = Field(default=None, min_length=1, max_length=255)
    biography: str | None = None
    behavioral_patterns: str | None = None
    appearance_description: str | None = None
    voice_id: str | None = None


class AmbassadorResponse(AmbassadorBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    reference_images: list[ReferenceImageResponse] = []

    model_config = ConfigDict(from_attributes=True)
