# Migration Path (Big Bang)

## Prerequisites — all must be done before cutover

1. **All node types implemented as activities**
   - GeminiNode → `execute_gemini`
   - VeoVideoGenerationNode → `execute_veo`
   - VideoEditorNode → `execute_video_editor`
   - ShotReviewNode → HITL signal handler (not an activity)
   - ScriptSupervisorNode → HITL signal handler
   - All utility nodes (StringInputNode, ConcatTextNode, etc.)
   - AvatarSceneNode (if still in use)

2. **`GraphWorkflow` implemented and integration-tested**
   - Topological batch execution
   - HITL signal path
   - Cancellation cleanup
   - Status event publishing (RabbitMQ, same format)

3. **Temporal server deployed in staging**
   - Helm chart applied
   - Connectivity verified from template-service pods
   - `temporal-ui` accessible

4. **Schema registry serving correct `object_info` format**
   - `GET /v1/engine/nodes` tested against frontend canvas

5. **`job_consumer.py` unchanged** — it already receives events via RabbitMQ, which
   activities still publish. No changes needed.

6. **`POST /v1/engine/jobs/{job_id}/cancel` implemented**
   - Maps to `temporal_client.get_workflow_handle(job_id).cancel()`

7. **ManualReviewService.complete_task signals Temporal**
   - One extra line added to existing endpoint

## Cutover procedure

1. Drain in-flight jobs: wait for all active ComfyUI jobs to finish, or manually cancel them
2. Deploy new template-service build (ComfyUI engine removed, Temporal worker started)
3. Temporal server already running (deployed in step 3 of prerequisites)
4. Smoke test: run one template end-to-end
5. Monitor Temporal UI for workflow failures for 30 minutes
6. Enable full traffic

## Rollback

Since this is big bang, rollback = redeploy the previous image tag. In-flight Temporal
workflows would be orphaned (Temporal has them, old code doesn't know about them). These
need to be terminated in Temporal UI and resubmitted via ComfyUI.

**Mitigating factor:** big bang at a time of low traffic (e.g. maintenance window)
minimises in-flight jobs at rollback time.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| A node type not yet implemented at cutover | Medium | Prerequisites checklist; block deploy without all activities registered |
| Graph JSON with node types that no longer exist | Low | `class_type` lookup failure returns clear error; job fails fast rather than silently |
| Temporal server instability day 1 | Low | Deploy to staging 2 weeks before production; run load test |
| History size growth for long-running workflows | Low | Typical graphs have 5-15 nodes; history stays small. Monitor after launch. |
| `job_consumer.py` misses events during cutover | Low | Consumer reconnects automatically; RabbitMQ persists events during reconnect window |

## What ComfyUI code can be deleted

- `engine/server.py` — PromptServer, WebSocket, queue API
- `engine/comfy_execution/` — graph executor, caching, progress
- `engine/comfy_api/` — ComfyUI SDK internals
- `engine/comfy_api_nodes/` — all node implementations (replaced by `activities/`)
- `engine/nodes.py` — node class registry
- `engine/app/` — ComfyUI app lifecycle
- `services/engine_client.py` — HTTP proxy to ComfyUI endpoints

**Can be kept (pure logic, no ComfyUI dependency):**
- `engine/comfy_execution/graph.py` — topological sort logic → move to `utils/graph.py`
- `engine/comfy_execution/graph_utils.py` — graph utilities
