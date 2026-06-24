# AMPLIFY-419: Temporal-based job execution engine

## Goal

Replace ComfyUI's single-worker execution engine with Temporal workflows to achieve
parallel job execution, durable state, and first-class HITL support.

## Context

`template-service` embeds a forked ComfyUI execution engine (`backend_template/engine/`).
ComfyUI was designed as a single-user desktop application: its `PromptQueue` processes
one graph at a time. All other submitted jobs wait. When a HITL node (`ShotReviewNode`)
is reached, it blocks the only worker with a polling loop until the user responds — which
can take hours. There is no durability: in-memory state (`prompt_metadata`, `_last_media`)
is lost on pod restart.

Affected layers:
- `template-service` execution engine (Python FastAPI + embedded ComfyUI)
- `GET /v1/engine/nodes` schema API (currently proxied from ComfyUI `object_info`)
- Node implementations (`engine/comfy_api_nodes/nodes_*.py`)
- `job_consumer.py` — RabbitMQ consumer that tracks job/node status in DB
- Frontend canvas — consumes node schemas and execution status events (no direct change needed)

## Design Decisions

1. **Full replacement**: ComfyUI execution engine removed entirely. Not wrapped.
2. **Nodes as Temporal activities**: each node type becomes a pure Python async function decorated with `@activity.defn`. The `IO.ComfyNode` class hierarchy is dropped.
3. **Graph format compatibility**: new executor reads existing ComfyUI prompt JSON format stored in `template_versions`. No DB migration needed at cutover.
4. **Schema API**: `GET /v1/engine/nodes` continues to return the same JSON contract. Source changes from ComfyUI `object_info` to a static/DB-backed registry owned by template-service.
5. **HITL via Temporal signals**: `ShotReviewNode` polling loop replaced by `workflow.wait_condition()` + `@workflow.signal`. Worker is freed during review wait.
6. **HITL expiry**: 48-hour timeout on review signal. On expiry: job is auto-cancelled, user notified.
7. **Cancellation**: `workflow_handle.cancel()`. Activities heartbeat in polling loops (Veo, ElevenLabs) so cancellation is responsive. Single-shot API calls (Gemini) complete naturally before cancel takes effect.
8. **Self-hosted Temporal**: deployed in existing K8s cluster via `temporalio/temporal` Helm chart, using shared PostgreSQL.
9. **Migration**: big bang. All node types must be implemented as activities before cutover. In-flight jobs drained or cancelled at cutover point.
10. **Scale target**: 100 concurrent jobs.

## Acceptance Criteria

- [ ] Temporal server deployed in K8s (Helm chart, PostgreSQL backend)
- [ ] All existing node types implemented as Temporal activities
- [ ] `GraphWorkflow` executes DAG: topological batching, parallel independent nodes
- [ ] HITL pause/resume via signal (no polling loop)
- [ ] HITL 48h timeout → job auto-cancel + user notification
- [ ] `workflow_handle.cancel()` cancels running job cleanly
- [ ] `GET /v1/engine/nodes` returns node schemas from static registry (ComfyUI removed)
- [ ] Job/node status events still flow via RabbitMQ → SignalR (same format)
- [ ] 100 concurrent jobs pass load test without queuing delay
- [ ] Pod restart mid-execution: job resumes from last completed activity

## Out of Scope

- Frontend canvas changes (schema contract preserved, status event format unchanged)
- DB schema migration for `template_versions` graph JSON
- Migration of historical job records
- Temporal Cloud (self-hosted only)
- Per-node retry policy tuning (follow-up issue)
