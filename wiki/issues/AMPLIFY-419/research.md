# Research: AMPLIFY-419 — Temporal job execution engine

## Overview

`template-service` uses a forked ComfyUI engine as its execution backend. ComfyUI is a
single-user desktop tool: one `PromptQueue`, one active graph at a time. At production
scale (target: 100 concurrent jobs) this is a hard architectural ceiling.

Three root problems:
1. **Serial execution**: ComfyUI `PromptQueue` is a single semaphore. All jobs queue.
2. **HITL blocks the worker**: `ShotReviewNode` holds an asyncio coroutine in a 5-second
   poll loop for the duration of human review (minutes to hours). No other job can run.
3. **No durability**: `prompt_metadata` and `_last_media` are in-memory dicts. Pod restart
   loses all in-flight job state.

**Resolution**: replace ComfyUI execution with Temporal workflows. Each job becomes a
durable workflow; each node becomes a Temporal activity. HITL pauses become signal-based
`wait_condition` calls — the worker is freed while waiting.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/temporal-dag-execution]] | How the ComfyUI graph DAG maps to a Temporal workflow with parallel activity batches |
| [[concepts/activity-design]] | Node-as-activity contract: inputs/outputs, output passing via MinIO refs vs. inline values, heartbeats |
| [[concepts/hitl-signal-model]] | HITL redesign: signal-based pause, 48h timeout, expiry handling |
| [[concepts/cancellation-model]] | Cancellation semantics: cooperative cancel, heartbeat requirement, external API behavior |
| [[concepts/schema-registry]] | Decoupling node schema API from ComfyUI `object_info`; static registry design |
| [[concepts/temporal-infra]] | Self-hosted K8s deployment, component sizing for 100 concurrent jobs |
| [[concepts/migration-path]] | Big bang cutover: prerequisites, risks, rollback |
| [[concepts/node-result-cache]] | Persistent node result cache (PostgreSQL now, Redis-ready); Redis scope decision |

## Open Questions

- What is the retry policy for individual activities? (Gemini 429, Veo transient errors)
  → out of scope for this issue, but activities must be idempotent by design.
- Should there be a dedicated Temporal task queue per node type (e.g. separate queue for
  Veo activities with longer schedule-to-close timeout)?
- Node schema registry: static file checked into repo, or DB table editable via admin UI?
- Notification mechanism for HITL expiry: RabbitMQ event → SignalR, or direct email/push?
