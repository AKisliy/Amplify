# HITL Signal Model

## Current design (polling)

`ShotReviewNode.execute()` blocks a coroutine indefinitely:

```python
while True:
    await asyncio.sleep(5)
    task = await repo.get_by_id(task_id)
    if task.status == "completed":
        break
```

**Problems:**
- Holds the only ComfyUI worker for the duration of human review (minutes to hours)
- No timeout — a user who never returns leaves the worker blocked permanently
- Pod restart destroys the polling loop → job stuck in WAITING_FOR_REVIEW forever

## Temporal design (signal-based)

HITL is handled at the **workflow level**, not inside an activity. Activities are
short-lived compute; the workflow holds durable state between steps.

```python
@workflow.defn
class GraphWorkflow:
    def __init__(self):
        self._review_decisions: dict[str, dict] = {}

    @workflow.signal
    async def shot_review_completed(self, node_id: str, decision: dict) -> None:
        self._review_decisions[node_id] = decision

    @workflow.run
    async def run(self, params: GraphWorkflowInput) -> GraphWorkflowResult:
        ...
        # When execution reaches a ShotReviewNode:
        review_id = await workflow.execute_activity(
            create_review_task,
            CreateReviewTaskInput(job_id=params.job_id, node_id=node_id, payload=...),
        )
        await workflow.execute_activity(
            publish_waiting_for_review,
            WaitingForReviewInput(job_id=params.job_id, node_id=node_id),
        )

        # Park the workflow — worker is FREE during this wait
        try:
            await workflow.wait_condition(
                lambda: node_id in self._review_decisions,
                timeout=timedelta(hours=48),
            )
        except asyncio.TimeoutError:
            await _handle_review_timeout(params.job_id, node_id)
            return GraphWorkflowResult(status="cancelled", reason="review_expired")

        decision = self._review_decisions.pop(node_id)
        # Continue DAG execution with decision data
        ...
```

## Resume path (HTTP → Signal)

The existing `POST /v1/review/{task_id}/complete` endpoint is preserved. It gains one
extra step: signal the workflow.

```python
# In ManualReviewService.complete_task():
await repo.update(task_id, status="completed", decision=req.decision)

# New: signal the workflow
handle = temporal_client.get_workflow_handle(job_id)  # job_id == workflow_id
await handle.signal("shot_review_completed", node_id=str(node_id), decision=req.decision)
```

**Frontend is unchanged.** It still calls the same HTTP endpoint. The signal is an
implementation detail of the backend.

## Timeout policy

| Scenario | Behavior |
|----------|----------|
| User submits decision within 48h | Workflow resumes, DAG continues |
| 48h elapsed, no decision | `TimeoutError` in workflow |
| On timeout | `cancel_review_task` activity, `finish_job(CANCELLED)` activity, `notify_user` activity |
| Worker pod restart during wait | Workflow state is in Temporal DB — resumes automatically on any worker |

The 48h value is a constant defined in `GraphWorkflow` and should be made configurable
via workflow input parameters in a follow-up.

## Multiple HITL nodes

A graph can contain multiple HITL nodes at different DAG positions. Each pause is handled
sequentially (the second HITL node is only reached after the first is approved). The
`_review_decisions` dict is keyed by `node_id` to avoid collisions.

## ScriptSupervisorNode

Follows the same signal pattern. It uses a different `node_type` in `ManualReviewTask`
and a different signal name (`script_review_completed`) to keep concerns separate.
