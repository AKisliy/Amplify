from typing import Any

from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Queue Item (parsed from raw engine tuple)
# ---------------------------------------------------------------------------
class QueueItem(BaseModel):
    """
    Parsed representation of the engine's prompt queue-item tuple.

    The engine stores this as a 5-element tuple:
        (number, prompt_id, prompt, extra_data, outputs_to_execute)
    The model_validator converts the tuple into named fields on arrival.
    """

    number: float
    prompt_id: str
    prompt: dict
    extra_data: dict
    outputs_to_execute: list[str]

    @model_validator(mode="before")
    @classmethod
    def from_tuple(cls, data):
        """Convert a raw 5-element tuple/list into a named dict."""
        if isinstance(data, (list, tuple)):
            return {
                "number": data[0],
                "prompt_id": data[1],
                "prompt": data[2],
                "extra_data": data[3],
                "outputs_to_execute": data[4],
            }
        return data


# ---------------------------------------------------------------------------
# Execution Status
# ---------------------------------------------------------------------------
class ExecutionStatus(BaseModel):
    """Status block returned by the engine for each completed prompt."""

    status_str: str  # "success" | "error"
    completed: bool
    messages: list  # [(event_name: str, event_data: dict), ...]


# ---------------------------------------------------------------------------
# History Entry (single prompt's execution record)
# ---------------------------------------------------------------------------
class HistoryEntry(BaseModel):
    """A single prompt's execution history entry."""

    prompt: QueueItem
    outputs: dict  # node_id → output data (unstructured, node-specific)
    status: ExecutionStatus
    meta: dict  # node_id → execution metadata


# ---------------------------------------------------------------------------
# Prompt Submission (POST /api/prompt)
# ---------------------------------------------------------------------------
class PromptRequest(BaseModel):
    """Request body for submitting a workflow graph for execution."""

    prompt: dict[str, Any] = Field(
        ...,
        description="Workflow graph — dict of node_id → Node definition.",
    )
    partial_execution_targets: list[str] | None = Field(
        default=None,
        description="Execute only these output nodes (+ upstream deps). "
        "Omit to run all OUTPUT_NODE nodes.",
    )
    extra_data: dict[str, Any] | None = Field(
        default=None,
        description="Arbitrary metadata forwarded to nodes via hidden inputs.",
    )
    number: float | None = Field(
        default=None,
        description="Queue priority (lower = higher). Auto-incremented if omitted.",
    )
    front: bool | None = Field(
        default=None,
        description="Push to front of queue.",
    )


class PromptResponse(BaseModel):
    """Successful response from POST /api/prompt."""

    prompt_id: str
    number: int
    node_errors: dict

