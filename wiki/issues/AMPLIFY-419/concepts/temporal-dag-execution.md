# Temporal DAG Execution

## Current ComfyUI approach

ComfyUI stores the graph as a flat JSON dict of nodes, each with `class_type` and `inputs`.
Inputs reference other nodes by `["<node_uuid>", <output_index>]`. The engine:
1. Builds a dependency graph from this JSON
2. Topologically sorts nodes
3. Executes sequentially, passing Python objects between nodes

The execution logic lives in `comfy_execution/graph.py`. This file is pure graph logic
and can be reused after migration.

## Temporal equivalent

Each job run = one `GraphWorkflow` instance. The workflow:
1. Parses the graph JSON into a DAG
2. Groups nodes into **topological batches** — nodes whose all dependencies are satisfied
3. Executes each batch as parallel `asyncio.gather()` of Temporal activities
4. Collects outputs, resolves next batch, repeats

```python
@workflow.defn
class GraphWorkflow:
    @workflow.run
    async def run(self, params: GraphWorkflowInput) -> GraphWorkflowResult:
        dag = parse_graph(params.graph_json)          # reuse comfy_execution/graph.py logic
        node_outputs: dict[str, NodeOutput] = {}

        for batch in topological_batches(dag):
            # Nodes in a batch have no dependencies on each other — run in parallel
            results = await asyncio.gather(*[
                workflow.execute_activity(
                    execute_node,
                    NodeActivityInput(
                        job_id=params.job_id,
                        node_id=node_id,
                        class_type=dag[node_id].class_type,
                        inputs=resolve_inputs(dag[node_id].inputs, node_outputs),
                        run_id=params.run_id,
                    ),
                    start_to_close_timeout=timedelta(minutes=30),
                )
                for node_id in batch
                if not is_hitl_node(dag[node_id].class_type)  # HITL handled separately
            ])
            for node_id, result in zip(batch, results):
                node_outputs[node_id] = result

        return GraphWorkflowResult(outputs=node_outputs)
```

## HITL nodes in the DAG

HITL nodes (`ShotReviewNode`, `ScriptSupervisorNode`) are not dispatched as activities.
They are handled at the **workflow level** as signal-wait points. See
[[hitl-signal-model]] for the full design.

When the batch contains a HITL node, the workflow:
1. Executes all non-HITL nodes in the batch normally
2. For the HITL node: calls `create_review_task` activity, then `wait_condition`

## Parallel execution benefit

With ComfyUI: nodes run one-at-a-time regardless of dependencies.
With Temporal: independent nodes in a batch run concurrently across workers.

Example — a graph with two independent Gemini calls feeding into a merge node:
- ComfyUI: Gemini #1 (3s) → Gemini #2 (3s) → merge = 6s total
- Temporal: Gemini #1 + Gemini #2 concurrently → merge = 3s total

## Workflow code is static; graph topology is dynamic

A common misconception: "if the workflow is code, the graph must be hardcoded."

`GraphWorkflow` is a **generic graph interpreter** — the code is deployed once and never
changes between template runs. What changes is the *input data* (`graph_json`) passed to
each workflow instance at start time. The workflow reads that JSON at runtime and decides
which activities to execute in what order.

Analogy: a Python interpreter is static compiled code, but the programs it runs are
fully dynamic. Same principle here.

```
User edits graph in canvas UI
        ↓
template_versions.graph_json updated in PostgreSQL
        ↓
POST /v1/engine/run → temporal_client.start_workflow(
    GraphWorkflow.run,
    GraphWorkflowInput(graph_json=<new graph>),  # ← runtime data, not code
    id=job_id,
)
        ↓
GraphWorkflow reads the new topology and dispatches different activities
```

**The only constraint**: every `class_type` referenced in the graph must exist in
`NODE_REGISTRY`. If the user wires in a `GeminiNode`, that activity must be deployed.
This is identical to the current ComfyUI constraint — unknown node types fail at
validation time, not silently at runtime.

## Graph format compatibility

The existing ComfyUI prompt JSON format is preserved. `parse_graph()` reads the same
`{ "<uuid>": { "class_type": "...", "inputs": {...} } }` structure stored in
`template_versions`. No DB migration needed at cutover.

The `class_type` string maps to a registered Temporal activity function via a
`NODE_REGISTRY` dict:

```python
NODE_REGISTRY: dict[str, Callable] = {
    "GeminiNode": execute_gemini,
    "VeoVideoGenerationNode": execute_veo,
    "VideoEditorNode": execute_video_editor,
    "ShotReviewNode": None,  # HITL — handled at workflow level
    ...
}
```
