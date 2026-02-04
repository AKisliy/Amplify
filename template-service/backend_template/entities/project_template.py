from datetime import datetime
from uuid import UUID
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

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