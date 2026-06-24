# Activity Design

## Node-as-activity contract

Each ComfyUI node type becomes a pure Python async function:

```python
@activity.defn
async def execute_gemini(input: GeminiActivityInput) -> GeminiActivityOutput:
    result = await gemini_client.generate(input.prompt, input.model)
    return GeminiActivityOutput(text=result.text)
```

The `IO.ComfyNode` class hierarchy, `IO.Schema`, `ComfyExtension` — all dropped.
Node implementations move from `engine/comfy_api_nodes/nodes_*.py` to a new
`activities/` package.

## Input/output passing

Temporal serializes all activity inputs and outputs to JSON (via Temporal's data
converter). This constrains what can flow between nodes.

### Rule: media goes through MinIO, not Temporal state

Video blobs, audio files, images — NEVER in Temporal workflow state. Already handled
correctly: current nodes output `video_uuid` / `image_uuid` strings. This pattern is
**mandatory** going forward.

| Data type | How to pass |
|-----------|-------------|
| Text, JSON, numbers | Inline in activity output (fine in Temporal state) |
| Generated prompt strings | Inline — typically <10KB |
| Image/video/audio | MinIO upload in producer activity; downstream receives UUID string |
| Large intermediate results | MinIO ref if >~64KB, otherwise inline |

### Output index compatibility

ComfyUI nodes can have multiple outputs, referenced by index: `["node_uuid", 0]`.
Activities return a Pydantic model; `resolve_inputs()` maps index → field:

```python
# In graph JSON: input wired to ["abc-123", 1] means second output of node abc-123
# Node abc-123 has class_type GeminiNode → GeminiActivityOutput(text=..., model_used=...)
# Index 0 → output.text, Index 1 → output.model_used
```

Each activity output type declares its field order explicitly to preserve compatibility
with existing graph JSON.

## Heartbeats — required for long-running activities

Activities that poll an external API must call `activity.heartbeat()` in the loop.
Without heartbeats, Temporal cannot detect if the worker died, and cancellation cannot
be delivered.

```python
@activity.defn
async def execute_veo(input: VeoActivityInput) -> VeoActivityOutput:
    operation = await veo_client.submit(input.prompt, input.params)

    while True:
        await asyncio.sleep(10)
        activity.heartbeat()  # tells Temporal "still alive, still polling"

        status = await veo_client.poll(operation.id)
        if status.done:
            return VeoActivityOutput(video_uuid=await upload_to_minio(status.video))
        if status.failed:
            raise ApplicationError(status.error)
```

**Timeout configuration for polling activities:**
- `heartbeat_timeout`: if no heartbeat for this duration → activity considered failed (e.g. 30s)
- `start_to_close_timeout`: wall-clock limit for the entire activity (e.g. 20min for Veo)

## Single-shot activities (Gemini, ElevenLabs)

Activities that make one HTTP call and return do not need heartbeats. They respond to
cancellation after the call completes — the workflow cancel takes effect before the next
activity starts.

```python
@activity.defn
async def execute_gemini(input: GeminiActivityInput) -> GeminiActivityOutput:
    # No heartbeat needed — single HTTP call
    result = await gemini_client.generate(input.prompt)
    return GeminiActivityOutput(text=result.text)
```

## Status event publishing

Currently ComfyUI's `PromptServer` publishes `NodeStatusChangedEvent` to RabbitMQ.
With Temporal, this moves into each activity:

```python
@activity.defn
async def execute_gemini(input: GeminiActivityInput) -> GeminiActivityOutput:
    await publish_node_status(input.job_id, input.node_id, "RUNNING")
    try:
        result = await gemini_client.generate(input.prompt)
        output = GeminiActivityOutput(text=result.text)
        await publish_node_status(input.job_id, input.node_id, "SUCCESS", outputs=...)
        return output
    except Exception as e:
        await publish_node_status(input.job_id, input.node_id, "FAILURE", error=str(e))
        raise
```

The `NodeStatusChangedEvent` format is unchanged — frontend and `job_consumer.py` are
unaffected.
