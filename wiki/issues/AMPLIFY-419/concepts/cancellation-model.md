# Cancellation Model

## How Temporal cancellation works

`workflow_handle.cancel()` sends a `RequestCancelExternalWorkflow` command to the
Temporal server. The server marks the workflow as "cancel requested" and delivers a
`CancelledError` to the workflow's `run()` coroutine at the next `await` point.

Propagation:
- **Pending activities** (not yet started): never dispatched
- **Running activities**: receive `CancelledError` on the next `activity.heartbeat()` call
- **wait_condition** (HITL pause): `CancelledError` raised immediately

The workflow can clean up in a `CancellationScope` or `try/finally`:

```python
@workflow.run
async def run(self, params: GraphWorkflowInput) -> GraphWorkflowResult:
    try:
        ...  # normal execution
    except asyncio.CancelledError:
        await workflow.execute_activity(
            finish_job,
            FinishJobInput(job_id=params.job_id, status="CANCELLED"),
            cancellation_type=ActivityCancellationType.WAIT_CANCELLATION_COMPLETED,
        )
        raise  # must re-raise to complete workflow cancellation
```

## Cooperative cancellation and heartbeats

Temporal cancellation is **cooperative**: an activity that never calls `heartbeat()` will
not receive the `CancelledError` until it returns naturally.

### Polling activities (must heartbeat)

Any activity that loops waiting for an external operation must heartbeat in the loop:

```python
@activity.defn
async def execute_veo(input: VeoActivityInput) -> VeoActivityOutput:
    operation = await veo_client.submit(...)
    while True:
        await asyncio.sleep(10)
        activity.heartbeat()   # CancelledError can arrive here
        status = await veo_client.poll(operation.id)
        if status.done:
            return ...
```

When `CancelledError` is raised at `heartbeat()`:
1. The `while` loop is interrupted
2. Temporal marks the activity as cancelled
3. Workflow `CancellationScope` or `finally` block runs

**Note:** the Veo operation itself continues on Google's side — we cannot cancel it
remotely. We just stop waiting for it and discard the result.

### Single-shot activities (Gemini, ElevenLabs, Whisper)

These make one HTTP call and return. They do not heartbeat. Cancellation takes effect
**after** the call completes — the workflow won't dispatch the next activity.

This means: if a user cancels a job while Gemini is mid-call (typically <5s), the call
completes, the result is discarded, and no further nodes run. Acceptable behaviour.

## Current flow vs. Temporal

| Scenario | Current | Temporal |
|----------|---------|----------|
| Cancel running job | `POST /interrupt` → ComfyUI flag | `handle.cancel()` → Temporal delivers CancelledError |
| Cancel queued job | Delete from PromptQueue | Never dispatched (Temporal holds in server) |
| Cancel HITL-paused job | Manual DB update required | `CancelledError` on `wait_condition` immediately |
| Pod restart mid-cancel | State lost, job stuck | Workflow resumes on new pod, cancel still pending |
| Multiple jobs | One job at a time anyway | Each workflow cancelled independently |

## Exposing cancellation in the API

`POST /v1/engine/jobs/{job_id}/cancel` (new endpoint):

```python
handle = temporal_client.get_workflow_handle(job_id)
await handle.cancel()
# job_consumer.py will receive CANCELLED status event and update DB
```

The existing `POST /v1/engine/interrupt` endpoint can be preserved as a compatibility
alias that maps `prompt_id` → `job_id` and calls the same cancellation.
