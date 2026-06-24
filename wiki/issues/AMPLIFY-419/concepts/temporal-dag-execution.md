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

## Как работают топологические батчи

Батч формируется по простому правилу: нода попадает в текущий батч тогда и только тогда,
когда **все** её зависимости уже выполнены.

```python
batch = [
    nid for nid in graph
    if nid not in completed and deps[nid].issubset(completed)
]
```

`issubset(completed)` — это и есть гарантия. Если хотя бы один предшественник не завершён,
нода ждёт следующей итерации цикла.

Пример для графа `A → B → D`, `C → D`, `C → E`:

```
Iteration 1 → batch: [A, C]   # у обоих deps = {} ⊆ completed={}
completed = {A, C}

Iteration 2 → batch: [B]      # deps={A} ⊆ {A,C} ✓
                               # D: deps={B,C}, B ∉ completed ✗
completed = {A, B, C}

Iteration 3 → batch: [D, E]   # D: deps={B,C} ⊆ {A,B,C} ✓
                               # E: deps={C} ⊆ {A,B,C} ✓
```

Каждый батч — один `asyncio.gather()`: ноды внутри батча выполняются параллельно,
батчи между собой строго последовательно.

Важное следствие: если граф полностью линейный (`A → B → C → D`), параллелизма нет —
каждый батч будет из одной ноды. Параллелизм возникает только там, где граф реально
ветвится.

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

## Что происходит при смерти пода во время выполнения

Это одна из ключевых гарантий Temporal: если под с воркером упал в середине графа —
выполнение **продолжится с того места, где остановилось**, а не с начала.

### Где хранится состояние воркфлоу

`GraphWorkflow` код выполняется на **Temporal Server**, а не в поде воркера.
Temporal Server хранит **event history** каждого воркфлоу в PostgreSQL (БД `temporal`).
Event history — append-only лог всего, что произошло:

```
WorkflowExecutionStarted    {params: ...}
ActivityTaskScheduled       {activity_type: "GeminiNode"}
ActivityTaskStarted
ActivityTaskCompleted       {result: {"text": "..."}}      ← GeminiText готов, сохранён
ActivityTaskScheduled       {activity_type: "GeminiImageNode"}
ActivityTaskStarted
ActivityTaskCompleted       {result: {"image_url": "..."}} ← GeminiImage готов, сохранён
ActivityTaskScheduled       {activity_type: "GeminiVideoNode"}
ActivityTaskStarted         ← здесь под умер
```

### Что происходит при смерти пода

Temporal Server отслеживает heartbeat от активности. При `heartbeat_timeout=60s`
(наш дефолт в `node_policies.py`) через 60 секунд Server помечает активность как failed
и ставит её в очередь повторно.

Когда под поднимается и воркер переподключается — он получает `GeminiVideoNode`
из очереди и выполняет её заново. **GeminiText и GeminiImage не перезапускаются** —
их результаты уже в event history.

### Deterministic replay

При reconnect Temporal Server отправляет воркеру весь event history.
Воркер прогоняет код `GraphWorkflow.run()` заново с нуля, но каждый
`await workflow.execute_activity(...)` сверяется с историей:

```python
# Replay воркфлоу после перезапуска пода:
execute_activity("GeminiNode")      # → в истории Completed → возвращает сохранённый результат
execute_activity("GeminiImageNode") # → в истории Completed → тоже из истории
execute_activity("GeminiVideoNode") # → в истории только Started, нет Completed → реально вызывает API
```

Код воркфлоу прогоняется целиком, но реальные вызовы внешних API не повторяются —
они воспроизводятся из истории.

### Следствие: активности должны быть идемпотентны

Если под умер **в середине** активности (после начала вызова API, но до записи результата
в event history), активность запустится повторно. Вео может создать видео дважды.

Варианты защиты:
- **Node result cache** (см. [[concepts/node-result-cache]]): перед вызовом API проверить кэш
  по хэшу входов — если результат уже есть, вернуть его. Это делает повторный запуск
  дешёвым и не тратит квоту.
- **`maximum_attempts=2`** для дорогих нод (Veo) — меньше шансов потратить квоту дважды,
  но не устраняет проблему дублирования полностью.
- Для нод, которые принципиально не идемпотентны, можно выставить
  `non_retryable_error_types` или `CACHEABLE = False` — тогда кэш не будет
  скрывать дубликат.

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
