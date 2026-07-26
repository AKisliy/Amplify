from typing import Any, Literal

from pydantic import BaseModel, Field


class TaskTextContent(BaseModel):
    type: str = Field("text")
    text: str = Field(...)


class TaskImageContentUrl(BaseModel):
    url: str = Field(...)


class TaskImageContent(BaseModel):
    type: str = Field("image_url")
    image_url: TaskImageContentUrl = Field(...)
    role: Literal["first_frame", "last_frame", "reference_image"] | None = Field(None)


class Text2VideoTaskCreationRequest(BaseModel):
    model: str = Field(...)
    content: list[TaskTextContent] = Field(..., min_length=1)
    generate_audio: bool | None = Field(None)


class LegacyImage2VideoTaskCreationRequest(BaseModel):
    """Request for legacy Seedance 1.5 Pro first/last-frame video generation.

    Identical structure to Text2VideoTaskCreationRequest but ``content`` also
    accepts ``TaskImageContent`` entries so first/last frame images can be
    included.  All generation parameters (resolution, ratio, duration, seed,
    watermark) are embedded as inline CLI flags in the text content, matching
    the legacy API convention.
    """
    model: str = Field(...)
    content: list[TaskTextContent | TaskImageContent] = Field(..., min_length=1)
    generate_audio: bool | None = Field(None)


class Seedance2TaskCreationRequest(BaseModel):
    model: str = Field(...)
    content: list[TaskTextContent | TaskImageContent] = Field(..., min_length=1)
    generate_audio: bool | None = Field(None)
    resolution: str | None = Field(None)
    ratio: str | None = Field(None)
    duration: int | None = Field(None, ge=4, le=15)
    seed: int | None = Field(None, ge=0, le=2147483647)
    watermark: bool | None = Field(None)


class TaskCreationResponse(BaseModel):
    id: str = Field(...)


class TaskStatusError(BaseModel):
    code: str = Field(...)
    message: str = Field(...)


class TaskStatusResult(BaseModel):
    video_url: str = Field(...)


class TaskStatusUsage(BaseModel):
    completion_tokens: int = Field(0)
    total_tokens: int = Field(0)


class TaskStatusResponse(BaseModel):
    id: str = Field(...)
    model: str = Field(...)
    status: Literal["queued", "running", "cancelled", "succeeded", "failed"] = Field(...)
    error: TaskStatusError | None = Field(None)
    content: TaskStatusResult | None = Field(None)
    usage: TaskStatusUsage | None = Field(None)


# Execution time estimates in seconds, keyed by resolution, for a 10-second video.
# Scale proportionally for other durations: actual_time ≈ estimate * (duration / 10).
VIDEO_TASKS_EXECUTION_TIME = {
    "seedance-1-5-pro-251215": {
        "480p": 80,
        "720p": 100,
        "1080p": 150,
    },
    "dreamina-seedance-2-0-260128": {
        "480p": 90,
        "720p": 120,
        "1080p": 180,
        "4k": 300,
    },
    "dreamina-seedance-2-0-fast-260128": {
        "480p": 60,
        "720p": 90,
    },
    "dreamina-seedance-2-0-mini": {
        "480p": 45,
        "720p": 70,
    },
}

# Seedance 2.0 model IDs mapped from display names.
SEEDANCE2_MODELS = {
    "Seedance 2.0": "dreamina-seedance-2-0-260128",
    "Seedance 2.0 Fast": "dreamina-seedance-2-0-fast-260128",
    "Seedance 2.0 Mini": "dreamina-seedance-2-0-mini",
}

# Token unit prices in USD per completion token for LiteLLM cost tracking.
# Confirm current values from BytePlus console → Seedance pricing.
# Set to None to disable cost tracking for a specific model (a warning will be logged).
SEEDANCE_TOKEN_UNIT_PRICES: dict[str, float | None] = {
    "seedance-1-5-pro-251215":           None,  # TODO: confirm from BytePlus pricing
    "dreamina-seedance-2-0-260128":      None,  # TODO: confirm from BytePlus pricing
    "dreamina-seedance-2-0-fast-260128": None,  # TODO: confirm from BytePlus pricing
    "dreamina-seedance-2-0-mini":        None,  # TODO: confirm from BytePlus pricing
}

