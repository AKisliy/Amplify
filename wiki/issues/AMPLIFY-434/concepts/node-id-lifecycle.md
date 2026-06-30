# Concept: Node ID Lifecycle

## Origin

Node ID — UUID-строка, генерируется фронтендом при добавлении ноды на canvas.
Хранится как `nodes[i].id` в `graph_json`.

## Flow

```
graph_json (ReactFlow)
  → convert_reactflow_to_comfy()
  → ComfyUI prompt dict (node UUID = key)
  → GraphWorkflow (Temporal)
  → NodeActivityInput.node_id
  → publish_node_status(job_id, node_id, ...)
  → NodeStatusChangedEvent (RabbitMQ)
  → WebSocket Gateway
  → Frontend canvas (сопоставляет по node_id с нодами на canvas)
```

Также:
```
GraphWorkflow.run_node(nid)
  → NodeExecution record (node_id = nid, job_id = job_id)
```

## Collision scenario

Два Project Template, скопированных из одного Library Template:
- Template A: node IDs = {uuid-1, uuid-2, uuid-3}
- Template B: node IDs = {uuid-1, uuid-2, uuid-3}  (одинаковые!)

При параллельном запуске:
- Job A (job_id=JA) и Job B (job_id=JB) — разные
- Но `NodeStatusChangedEvent` содержит `node_id=uuid-1` без привязки к шаблону
- Фронтенд, отображающий Template A, видит события для `uuid-1` от Job B
- Результат: некорректные обновления статуса, "обновления не приходят" для правильного шаблона

## Why job_id alone doesn't fix it

Frontend подписывается на обновления и матчит события по `node_id` для конкретного canvas.
Если два шаблона имеют одинаковые `node_id`, события перекрываются на уровне UI routing.

## Fix

Ремаппинг `nodes[i].id` при дублировании (в `duplicate_from_library`).
Новые UUIDs генерируются сервисом, не фронтендом. Edges обновляются соответственно.

Связанные концепции: [[graph-json-format]]
