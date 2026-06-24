# Per-job Execution Context (exec_context)

## Проблема: extra_pnginfo

В ComfyUI-движке ноды передавали контекст через `extra_pnginfo` — глобальный dict,
прикреплённый к run'у. Нода записывала туда данные, следующая читала. Пример:
`VeoVideoGenerationNode` писал `media_prompts[uuid] = prompt`, `ScriptSupervisorNode`
читал это для отображения в UI ревью.

В Temporal-мире `extra_pnginfo` не существует. Activity изолированы: у каждой свои
входы и выходы. Данные могут течь только через:
1. Wire-связи в ComfyUI-формате (явные выходы → входы)
2. Новый механизм — `exec_context`

## Решение: exec_context

`exec_context` — dict на инстансе `GraphWorkflow`, накапливающий контекст в течение
всего выполнения job'а. Аналог `extra_pnginfo`, но дурабельный и явный.

```python
class GraphWorkflow:
    def __init__(self) -> None:
        self._exec_context: dict = {}
```

### Как данные попадают в контекст

Каждая нода (обычная или HITL) может вернуть `_context_patch` — дельту, которую
workflow применяет к `_exec_context`. Хранится под ключом `"_context_patch"` в
возвращаемом dict'е.

```python
# Workflow применяет патч после каждой ноды
for nid, result in zip(known, results):
    node_outputs[nid] = result
    if isinstance(result, dict):
        patch = result.get("_context_patch")
        if patch:
            self._exec_context.update(patch)
```

`_context_patch` — только то, что нода хочет добавить или изменить. Не полный контекст.

### Как контекст доставляется в активность

Перед запуском каждой активности workflow делает снимок:

```python
NodeActivityInput(
    ...
    exec_context=dict(self._exec_context),  # снимок на момент запуска
)
```

Активность получает read-only снимок. Она не может изменить `_exec_context` напрямую —
только вернуть `_context_patch` в результате.

### Кто производит _context_patch

**Обычные ноды** — возвращают его как часть dict'а из `execute()`. Пример:
```python
# VeoVideoGenerationNode
return {
    "video_uuids": [...],
    "_context_patch": {
        MEDIA_PROMPTS: {uuid: prompt, ...},
        MEDIA_GEN_PARAMS: {uuid: {...}, ...},
    }
}
```

**HITL-ноды** — `hitl_context(resolved, decision)` возвращает `_context_patch`.
`hitl_finalize` упаковывает его в результат:
```python
return {**wire_outputs, "_context_patch": context_patch}
```

### Кэш и exec_context

При кэш-хите workflow не запускает активность. Но `_context_patch` нужен, чтобы
downstream-ноды получили корректный контекст. Поэтому кэш хранит его вместе с
wire-выходами:

```json
{
  "video_uuids": ["uuid1", "uuid2"],
  "_context_patch": {"shot_decisions": {"uuid1": {...}}}
}
```

При кэш-хите workflow извлекает `_context_patch` из cached_value и применяет к
`_exec_context` — как при нормальном выполнении.

## Контекстные ключи

Определены в `comfy_api_nodes/context_keys.py`:

```python
MEDIA_PROMPTS   = "media_prompts"    # {uuid: str} — prompt, под которым генерировалось видео
MEDIA_GEN_PARAMS = "media_gen_params" # {uuid: dict} — полные параметры генерации
```

`ScriptSupervisorNode.hitl_payload()` читает оба из `exec_context`:
```python
media_prompts = exec_context.get(MEDIA_PROMPTS, {})
media_gen_params = exec_context.get(MEDIA_GEN_PARAMS, {})
```

## Сравнение с extra_pnginfo

| | extra_pnginfo (ComfyUI) | exec_context (Temporal) |
|---|---|---|
| Хранение | In-memory dict на run | Дурабельно в workflow state |
| Как нода пишет | `extra_pnginfo["key"] = value` | Возвращает `_context_patch` |
| Как нода читает | `cls.hidden.extra_pnginfo["key"]` | `inp.exec_context["key"]` |
| Рестарт пода | Потеря всего | Восстанавливается из event history |
| Видимость | Глобальный mutable | Снимок на момент запуска активности |
