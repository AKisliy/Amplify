# Concept: graph_json Format

## Storage

Хранится в колонке `current_graph_json` (JSONB) в таблице `project_templates` (и `library_templates`).

## Structure (ReactFlow format)

```json
{
  "nodes": [
    {
      "id": "<uuid-string>",
      "type": "...",
      "data": {
        "schemaName": "VeoModel",
        "config": { "prompt": "...", ... },
        "ports": [
          { "id": "<port-id>", "direction": "input"|"output", "isAutogrowSlot": false, ... }
        ],
        "_meta": { "can_use_cache": false }
      }
    }
  ],
  "edges": [
    {
      "source": "<node-uuid>",
      "sourceHandle": "<port-id>",
      "target": "<node-uuid>",
      "targetHandle": "<port-id>"
    }
  ]
}
```

## What needs to be unique globally

- `nodes[i].id` — UUID ноды. Используется как ключ в ComfyUI prompt, как `node_id` в
  `NodeExecution` и в `NodeStatusChangedEvent`. **Должен быть уникален между шаблонами.**

## What is NOT globally unique (scoped to node)

- `nodes[i].data.ports[i].id` — port/handle ID. Уникален только внутри ноды.
- `edges[i].sourceHandle` / `edges[i].targetHandle` — ссылаются на port IDs.

## Conversion to ComfyUI format

`utils/graph.py:convert_reactflow_to_comfy()` преобразует ReactFlow → ComfyUI:
```json
{
  "<node-uuid>": {
    "class_type": "VeoModel",
    "inputs": {
      "prompt": "...",
      "video": ["<source-node-uuid>", 0]
    }
  }
}
```

Node UUID становится ключом в ComfyUI prompt dict. Ссылки на upstream ноды сохраняют
те же UUIDs в формате `["upstream-node-uuid", output_slot_index]`.
