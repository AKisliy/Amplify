"""
Event schemas for Template Service → other services communication.

These Pydantic models define the payloads published to RabbitMQ when
Library Templates are created, updated, or deleted. Other services
(e.g. UserService) consume these events to maintain referential integrity.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateEventType(StrEnum):
    CREATED = "template.created"
    UPDATED = "template.updated"
    DELETED = "template.deleted"


class LibraryTemplateEvent(BaseModel):
    """
    Base event payload for Library Template state changes.

    Published to the ``template.events`` fanout exchange so any downstream
    service can subscribe without knowing the routing topology upfront.
    """

    event_type: TemplateEventType = Field(
        description="Discriminator: what happened to the template."
    )
    template_id: UUID = Field(
        description="ID of the affected Library Template."
    )
    occurred_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="UTC timestamp of when the event occurred.",
    )


class LibraryTemplateCreatedEvent(LibraryTemplateEvent):
    """Published right after a new Library Template is persisted."""

    event_type: TemplateEventType = TemplateEventType.CREATED
    name: str = Field(description="Display name of the new template.")
    description: str | None = Field(
        default=None,
        description="Optional description.",
    )
    thumbnail_url: str | None = Field(
        default=None,
        description="Thumbnail URL if already set at creation time.",
    )


class LibraryTemplateUpdatedEvent(LibraryTemplateEvent):
    """
    Published after a Library Template is patched.
    Only the fields that were actually changed are included (others are None).
    """

    event_type: TemplateEventType = TemplateEventType.UPDATED
    changed_fields: dict[str, Any] = Field(
        default_factory=dict,
        description="Map of field name → new value for every field that changed.",
    )


class LibraryTemplateDeletedEvent(LibraryTemplateEvent):
    """Published after a Library Template is removed from the library."""

    event_type: TemplateEventType = TemplateEventType.DELETED
