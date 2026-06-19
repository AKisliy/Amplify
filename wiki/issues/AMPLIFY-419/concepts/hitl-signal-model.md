# HITL Signal Model

## v1: ComfyUI polling (заменён)

`ShotReviewNode.execute()` блокировал coroutine бесконечным циклом:

```python
while True:
    await asyncio.sleep(5)
    task = await repo.get_by_id(task_id)
    if task.status == "completed":
        break
```

**Проблемы:**
- Удерживал единственный ComfyUI-воркер на время ревью (минуты–часы)
- Нет таймаута — пользователь, который не вернулся, блокирует воркер навсегда
- Рестарт пода → polling loop уничтожен → job навсегда застрял в WAITING_FOR_REVIEW

---

## v2: Temporal signals (реализовано)

### Ключевые принципы

- HITL обрабатывается на уровне **workflow**, не внутри activity
- Activity — короткоживущий compute; workflow удерживает состояние между шагами
- Воркер **свободен** во время ожидания человека
- Несколько HITL-нод в одном батче работают **конкурентно**: все переходят в WAITING_FOR_REVIEW одновременно, каждая разблокируется независимо по своему сигналу

### Интерфейс HITL-ноды

Нода объявляет себя HITL-нодой через атрибут класса и четыре classmethod. Это аналог `temporal_policy` для обычных нод.

```python
class ShotReviewNode(IO.ComfyNode):
    temporal_hitl = True                          # флаг для workflow

    @classmethod
    def hitl_node_type(cls) -> str:               # node_type в ManualReviewTask
        return "shot_review"

    @classmethod
    def hitl_payload(cls, resolved: dict, exec_context: dict) -> dict:
        # Что сохранить в ManualReviewTask.payload.
        # exec_context содержит накопленный контекст job'а (media_prompts, gen_params, ...)
        return {"video_uuids": resolved.get("video_uuids") or []}

    @classmethod
    def hitl_output(cls, resolved: dict, decision: dict) -> tuple:
        # Wire-выходы ноды (порядок совпадает с define_schema().outputs)
        return (resolved.get("video_uuids") or [],)

    @classmethod
    def hitl_context(cls, resolved: dict, decision: dict) -> dict:
        # _context_patch: что эта нода добавляет/меняет в exec_context
        return {"shot_decisions": decision} if decision else {}
```

Новая нода добавляется без правок в воркфлоу или воркер — только файл с классом в `comfy_api_nodes/`.

### Две активности вместо одной

| Активность | Что делает |
|---|---|
| `hitl_setup` | Проверка кэша → детект auto_confirm → создание `ManualReviewTask` в DB → публикация `WAITING_FOR_REVIEW` |
| `hitl_finalize` | `hitl_output()` + `hitl_context()` → запись в кэш → публикация `SUCCESS` |

Workflow между ними вызывает `wait_condition` — ни воркер, ни thread не заняты.

### Workflow: сигнал и состояние

```python
@workflow.defn
class GraphWorkflow:
    def __init__(self) -> None:
        self._pending_hitl: dict[str, dict] = {}  # node_id → decision
        self._exec_context: dict = {}             # накопленный контекст job'а

    @workflow.signal
    def hitl_complete(self, node_id: str, decision: dict) -> None:
        self._pending_hitl[node_id] = decision

    async def _run_hitl_node(self, nid: str, inp: NodeActivityInput) -> dict:
        setup = await workflow.execute_activity(hitl_setup, args=[inp], ...)

        if setup.is_cached:
            return setup.cached_value                   # кэш-хит — финализация не нужна

        if not setup.auto_confirmed:
            await workflow.wait_condition(lambda: nid in self._pending_hitl)
            decision = self._pending_hitl.pop(nid)
        else:
            decision = {}

        finalize_inp = HitlFinalizeInput(inp=inp, decision=decision, cache_key=setup.cache_key)
        return await workflow.execute_activity(hitl_finalize, args=[finalize_inp], ...)
```

`_pending_hitl` — дурабельное состояние в Temporal event history. При рестарте воркера сигналы реплеируются из истории, `_pending_hitl` восстанавливается детерминистически. Данные не теряются.

### Конкурентность в батче

HITL-ноды в одном топологическом батче помещаются в один `asyncio.gather` с обычными нодами:

```python
results = await asyncio.gather(*[
    self._run_hitl_node(nid, inp) if _is_hitl(class_types[nid])
    else workflow.execute_activity(class_types[nid], args=[inp], **policy_for(...))
    for nid, inp in zip(known, activity_inputs)
])
```

Каждый `wait_condition` ждёт в своей корутине. Если два ShotReviewNode стоят в одном батче — оба переходят в WAITING_FOR_REVIEW одновременно и разблокируются независимо.

### Путь возобновления (HTTP → Signal)

`POST /v1/review/{task_id}/complete` сохраняется без изменений. В конце `complete_task()` добавляется один шаг:

```python
updated = await self.repo.update(task_id, status="completed", decision=req.decision)
await _send_hitl_signal(str(orm.job_id), str(orm.node_id), req.decision or {})
```

`_send_hitl_signal` получает handle workflow'а через `job_id` (он же workflow_id) и отправляет `hitl_complete`. Frontend ничего не знает об этом.

### Кэширование HITL-нод

HITL-ноды кэшируются так же, как обычные ноды. `hitl_setup` проверяет кэш первым делом. При попадании публикует `CACHED` и возвращает cached_value немедленно — `hitl_finalize` не вызывается, человек не привлекается.

Структура закэшированного значения:
```json
{
  "video_uuids": ["uuid1", "uuid2"],
  "_context_patch": {"shot_decisions": {...}}
}
```

Workflow извлекает `_context_patch` из результата и применяет к `_exec_context` — как при нормальном выполнении, так и при кэш-хите.

### Таймаут ревью

**Ещё не реализован** (не войдёт в первую итерацию). В plan.md обозначен как 48 ч.
`wait_condition` принимает параметр `timeout=timedelta(hours=48)` — можно добавить позже.

## Сигнал vs. Callback

| | Polling (v1) | Signal (v2) |
|---|---|---|
| Воркер во время ожидания | Занят (coroutine) | Свободен |
| Рестарт пода | Job застрял | Автоматическое возобновление |
| Несколько HITL нод | Нельзя (serial) | Конкурентно |
| Добавление новой HITL ноды | Правки в воркфлоу | Только новый файл с классом |
