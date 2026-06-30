# AMPLIFY-434: Fix ID Collision on Template Duplication

## Goal

Remapping node IDs при дублировании Library Template в Project Template, чтобы каждый экземпляр имел уникальные IDs нод и мог исполняться параллельно.

## Context

Граф шаблона хранится в `current_graph_json` (JSONB) в ReactFlow-формате:
```json
{
  "nodes": [{ "id": "<uuid>", "data": { "schemaName": "...", "config": {}, "ports": [] } }],
  "edges": [{ "source": "<node-uuid>", "target": "<node-uuid>", "sourceHandle": "<port-id>", "targetHandle": "<port-id>" }]
}
```

Node IDs из этого JSON используются в трёх местах:
1. `NodeExecution.node_id` — в БД, для трекинга статуса каждой ноды в рамках job
2. `NodeStatusChangedEvent.node_id` — в RabbitMQ-событиях → WebSocket Gateway → Frontend
3. Внутри `graph_json` при конвертации в ComfyUI-формат: `["source_node_id", slot_index]`

**Путь дублирования**: `POST /v1/templates/from-library` →
`ProjectTemplateService.duplicate_from_library` → копирует `graph_json` как есть.

Когда два Project Template созданы из одного Library Template, у них одинаковые node IDs.
При параллельном запуске события от одного шаблона попадают на canvas другого — фронтенд
получает дублированные / неправильно атрибутированные обновления.

## Design Decisions

**Где фиксить**: в сервисном слое — `ProjectTemplateService.duplicate_from_library`.
Не на уровне репозитория и не в момент запуска (runtime). Причина: граф должен быть
уникальным с момента создания шаблона, а не только во время исполнения.

**Что ремаппить**: только `nodes[i].id`, `edges[i].source`, `edges[i].target`.
- `edges[i].sourceHandle` / `edges[i].targetHandle` — это port IDs, они
  не являются node IDs и глобально не уникальны (их уникальность в скоупе ноды).
- `nodes[i].data.ports[i].id` — то же: port ID, не node ID, не трогаем.
- Если `graph_json` пустой или не ReactFlow-формата — пропускаем ремаппинг без ошибки.

**Алгоритм**:
1. Deep copy `graph_json`
2. Построить `old_id → new_uuid` маппинг по всем `nodes[i].id`
3. Заменить `nodes[i].id` на `new_uuid`
4. Заменить `edges[i].source` и `edges[i].target` через маппинг

**Где реализовать**: вынести в `backend_template/utils/graph.py` как `remap_node_ids(graph: dict) -> dict`.
Вызывать из `duplicate_from_library`.

## Acceptance Criteria

- [ ] Два Project Template, созданных из одного Library Template, имеют разные node IDs во всех нодах
- [ ] Edges корректно обновлены: source/target ссылаются на новые IDs
- [ ] Внутренняя структура нод (config, ports, schemaName) не изменена
- [ ] Параллельный запуск двух таких шаблонов не вызывает перекрёстных NodeStatusChangedEvent на фронтенде
- [ ] Юнит-тест на `remap_node_ids`: проверяет что все IDs уникальны и edges обновлены
- [ ] Пустой / невалидный `graph_json` обрабатывается без exception

## Out of Scope

- Дублирование Project Template → Project Template (такого endpoint'а сейчас нет)
- Ремаппинг port IDs (они не глобальные, коллизий не создают)
- Изменения в WebSocket Gateway или фронтенде
