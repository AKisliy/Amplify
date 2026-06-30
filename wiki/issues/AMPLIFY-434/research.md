# Research: AMPLIFY-434

## Overview

При дублировании Library Template в Project Template (`POST /v1/templates/from-library`)
`graph_json` копируется как есть. Node IDs в скопированном графе идентичны исходному.

Это вызывает коллизию: `NodeStatusChangedEvent` содержит `node_id`, который совпадает у
нескольких шаблонов. Фронтенд, подписанный на canvas одного шаблона, получает события от
другого (дубля), что выражается в некорректных обновлениях статуса нод.

Исправление: добавить `remap_node_ids()` в `utils/graph.py` и вызывать её при дублировании.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/graph-json-format]] | ReactFlow-формат графа, хранение в БД, поля node/edge |
| [[concepts/node-id-lifecycle]] | Как node ID используется от graph_json до RabbitMQ события |

## Open Questions

_(нет открытых вопросов — решение определено)_
