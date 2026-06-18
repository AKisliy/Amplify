# Activity Retry Policy

## Где задаётся политика

В Temporal retry policy задаётся **на стороне вызывающего** — в `workflow.execute_activity()`,
а не в определении активности (`@activity.defn`). Это значит, что один и тот же динамический
обработчик может иметь разные политики для разных типов нод.

## Архитектура

```
nodes_veo2.py                node_policies.py             graph.py (workflow)
─────────────────────────    ─────────────────────────    ─────────────────────────────
class VeoVideoGenerationNode  def policy_for(class_type):  workflow.execute_activity(
  temporal_policy = {   ──►    node_cls = NODE_CLASS_MAP     class_type,
    timeout=90min,              override = node_cls           args=[inp],
    retry=2,                              .temporal_policy    **policy_for(class_type),
  }                             return {                    )
                                  **DEFAULT_POLICY,
                                  **override,
                                }
```

## Как настроить политику для ноды

Добавь атрибут `temporal_policy` в класс ноды:

```python
from datetime import timedelta
from temporalio.common import RetryPolicy

class VeoVideoGenerationNode(IO.ComfyNode):
    temporal_policy = {
        "start_to_close_timeout": timedelta(minutes=90),
        "retry_policy": RetryPolicy(maximum_attempts=2),
    }
```

Указывай только те ключи, которые отличаются от дефолта — остальное подтянется из
`DEFAULT_POLICY` в `node_policies.py`.

Ноды без `temporal_policy` используют `DEFAULT_POLICY` as-is.

## DEFAULT_POLICY (node_policies.py)

| Параметр | Значение |
|---|---|
| `start_to_close_timeout` | 45 min |
| `heartbeat_timeout` | 60 s |
| `retry_policy.maximum_attempts` | 3 |

## Доступные ключи переопределения

Все ключи `workflow.execute_activity()`:

| Ключ                        | Тип           | Пример                                                                            |
| --------------------------- | ------------- | --------------------------------------------------------------------------------- |
| `start_to_close_timeout`    | `timedelta`   | `timedelta(minutes=90)`                                                           |
| `schedule_to_close_timeout` | `timedelta`   | `timedelta(hours=2)`                                                              |
| `heartbeat_timeout`         | `timedelta`   | `timedelta(seconds=120)`                                                          |
| `retry_policy`              | `RetryPolicy` | `RetryPolicy(maximum_attempts=2, non_retryable_error_types=["RAIFilteredError"])` |

### Параметры RetryPolicy

```python
RetryPolicy(
    initial_interval=timedelta(seconds=1),   # первый retry через 1s
    backoff_coefficient=2.0,                 # экспоненциальный backoff
    maximum_interval=timedelta(seconds=100), # максимальный интервал
    maximum_attempts=3,                      # 0 = бесконечно
    non_retryable_error_types=["MyError"],   # ошибки, которые не ретраить
)
```

## Примеры реальных нод

### VeoVideoGenerationNode (nodes_veo2.py)
```python
temporal_policy = {
    "start_to_close_timeout": timedelta(minutes=90),
    "retry_policy": RetryPolicy(maximum_attempts=2),
    # Veo дорогой — минимум ретраев, чтобы не сжечь квоту
}
```

### Ноды без переопределения
Gemini, VideoEditor и другие быстрые ноды — используют `DEFAULT_POLICY` (45 min, 3 retry).
Если нода начинает зависать или имеет особую стоимость ошибки — добавляй `temporal_policy`.

## Non-retryable ошибки

Некоторые ошибки не имеет смысла ретраить:

```python
temporal_policy = {
    "retry_policy": RetryPolicy(
        maximum_attempts=3,
        non_retryable_error_types=["RAIFilteredError"],
        # RAI фильтрация — детерминированная, ретрай ничего не изменит
    ),
}
```

`RAIFilteredError` уже поднимается в `nodes_veo2.py` — имеет смысл добавить его в
`non_retryable_error_types` чтобы не тратить 2 лишних ретрая.
