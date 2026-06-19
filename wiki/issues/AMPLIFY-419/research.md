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

**Статус реализации (2026-06-19):**
- `GraphWorkflow` + топологические батчи + параллельные активности ✅
- Динамическая активность `execute_node` (все обычные ноды) ✅
- CACHED статус + UI Cache Zone на канвасе ✅
- Кэш нод (PostgreSQL, TTL 7 дней) ✅
- Per-node политики retry/timeout (`temporal_policy`) ✅
- HITL v2: `hitl_setup`/`hitl_finalize` + `hitl_complete` signal + `exec_context` ✅
- HITL таймаут 48 ч — ещё не реализован

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
| [[concepts/activity-retry-policy]] | Per-node retry/timeout policy via `temporal_policy` class attribute; dynamic dispatch via `policy_for()` |
| [[concepts/exec-context]] | Per-job execution context (`_exec_context` на workflow); заменяет `extra_pnginfo`; `_context_patch` — дельта от каждой ноды |

## Open Questions

- Should there be a dedicated Temporal task queue per node type (e.g. separate queue for
  Veo activities with longer schedule-to-close timeout)?
- Node schema registry: static file checked into repo, or DB table editable via admin UI?
- Notification mechanism for HITL expiry: RabbitMQ event → SignalR, or direct email/push?
