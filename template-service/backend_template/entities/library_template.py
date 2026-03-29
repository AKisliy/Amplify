from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# -----------------------------------------------------------------------------
# 1. The Base Rule (Shared Contract)
# -----------------------------------------------------------------------------
class LibraryTemplateBase(BaseModel):
    """
    Shared fields used in both Creation (Input) and Reading (Output).
    Contains business validation rules.
    """
    name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="The display name of the library template card."
    )

    description: str | None = Field(
        default=None,
        description="Optional description of what this template does."
    )

    graph_json: dict[str, Any] = Field(
        default_factory=dict,
        description="The static ComfyUI-style node graph definition."
    )

    thumbnail_url: str | None = Field(
        default=None,
        description="Signed HTTPS URL to the template's thumbnail image on GCS."
    )


# -----------------------------------------------------------------------------
# 2. The Create Rule (Input Specialization)
# -----------------------------------------------------------------------------
class LibraryTemplateCreate(LibraryTemplateBase):
    """
    Fields required to CREATE a new library template (internal use only).
    Inherits everything from Base.
    """
    pass


# -----------------------------------------------------------------------------
# 3. The Update Rule (Partial Modification)
# -----------------------------------------------------------------------------
class LibraryTemplateUpdate(BaseModel):
    """
    Fields allowed to be UPDATED (internal use only).
    CRITICAL: Inherits from BaseModel, NOT LibraryTemplateBase.
    All fields are optional (None) to support PATCH operations.
    """
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=255
    )

    description: str | None = Field(
        default=None
    )

    graph_json: dict[str, Any] | None = Field(
        default=None
    )

    thumbnail_url: str | None = Field(
        default=None
    )


# -----------------------------------------------------------------------------
# 4. The Response Rule (Output & Serialization)
# -----------------------------------------------------------------------------
class LibraryTemplateResponse(LibraryTemplateBase):
    """
    The full representation returned to the client.
    Inherits from Base (Shared fields) + Adds System fields (ID, Timestamps).
    """
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Pydantic V2 Configuration for ORM mapping
    model_config = ConfigDict(from_attributes=True)
