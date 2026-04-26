from datetime import datetime
from uuid import UUID
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

# -----------------------------------------------------------------------------
# 0. Description config value object
# -----------------------------------------------------------------------------
class PostDescriptionConfig(BaseModel):
    """
    Describes how the post description is produced when auto-publishing.

    type="static"  → use `value` as-is.
    type="dynamic" → generate via LLM using `prompt_template` (future work).
    """
    type: Literal["static", "dynamic"] = "static"
    value: str | None = None             # populated for static
    prompt_template: str | None = None   # populated for dynamic (reserved)

    def resolve(self) -> str | None:
        """Return the ready-to-publish description string, or None."""
        if self.type == "static":
            return self.value or None
        # dynamic: not yet implemented — caller should handle None gracefully
        return None


# -----------------------------------------------------------------------------
# 1. The Base Rule (Shared Contract)
# -----------------------------------------------------------------------------
class ProjectTemplateBase(BaseModel):
    """
    Shared fields used in both Creation (Input) and Reading (Output).
    Contains business validation rules.
    """
    project_id: UUID = Field(
        ...,
        description="The UUID of the parent Project this template belongs to."
    )
    
    name: str = Field(
        ..., 
        min_length=1, 
        max_length=255, 
        description="The human-readable name of the template."
    )
    
    description: str | None = Field(
        default=None, 
        description="Optional description of the template's purpose."
    )
    
    current_graph_json: dict[str, Any] = Field(
        default_factory=dict,
        description="The ComfyUI-style node graph definition. Defaults to empty object."
    )

    auto_list_ids: list[UUID] = Field(
        default_factory=list,
        description="AutoList UUIDs associated with this template for auto-publishing."
    )

    post_description_config: PostDescriptionConfig | None = Field(
        default=None,
        description="Structured description config used when auto-publishing the generated media post."
    )


# -----------------------------------------------------------------------------
# 2. The Create Rule (Input Specialization)
# -----------------------------------------------------------------------------
class ProjectTemplateCreate(ProjectTemplateBase):
    """
    Fields required to CREATE a new template.
    Inherits everything from Base. 
    Body is 'pass' because no extra write-only fields (like passwords) are needed.
    """
    pass


# -----------------------------------------------------------------------------
# 3. The Update Rule (Partial Modification)
# -----------------------------------------------------------------------------
class ProjectTemplateUpdate(BaseModel):
    """
    Fields allowed to be UPDATED.
    CRITICAL: Inherits from BaseModel, NOT ProjectTemplateBase.
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
    
    current_graph_json: dict[str, Any] | None = Field(
        default=None
    )

    auto_list_ids: list[UUID] | None = Field(
        default=None
    )

    post_description_config: PostDescriptionConfig | None = Field(
        default=None
    )

    # NOTE: project_id is intentionally omitted.
    # You cannot move a template to a different project via Update.


# -----------------------------------------------------------------------------
# 4. The Response Rule (Output & Serialization)
# -----------------------------------------------------------------------------
class ProjectTemplateResponse(ProjectTemplateBase):
    """
    The full representation returned to the client.
    Inherits from Base (Shared fields) + Adds System fields (ID, Timestamps).
    """
    id: UUID
    created_at: datetime
    updated_at: datetime

    # Pydantic V2 Configuration for ORM mapping
    model_config = ConfigDict(from_attributes=True)