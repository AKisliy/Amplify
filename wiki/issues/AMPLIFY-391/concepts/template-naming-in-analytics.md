# Concept: Template Naming in Analytics

## Проблема

Имя шаблона живёт в template-service. Аналитические query handlers в userservice оперируют `template_id` (Guid) из `job_executions`. Cross-service join в реальном времени — дорого и создаёт coupling. В результате Yield Efficiency и Generation Velocity per-template на глобальном дашборде показывают нечитаемые UUID вместо осмысленных названий.

## Варианты решения

### A — Денормализация имени в job_executions ✅ Рекомендован

При создании job-записи копировать `template_name` в `job_executions` рядом с `template_id`.

```sql
-- job_executions
template_id   uuid
template_name text   -- <-- добавить
```

**Плюсы:**
- Не требует cross-service вызовов в query time
- "Имя на момент выполнения" — исторически корректно: переименование шаблона не ломает историческую аналитику
- Работает для любых шаблонов: и library, и кастомных пользователя
- Минимальные изменения: один столбец + заполнение при создании job

**Минусы:**
- Stale по определению (но для аналитики это правильное поведение)

### B — Template name в LiteLLM metadata

В `client.py` добавить `template_name` при enrichment запроса → попадает в `spendlog_metadata` → доступно через analytics view.

**Ограничение:** покрывает только spend-метрики (LiteLLM path). Generation Velocity берётся из `job_executions`, metadata там нет. Частичное решение.

### C — Library template link

Шаблоны хранят `library_template_id`. Аналитика группируется по library template — bounded set с чистыми лейблами.

**Проблемы:**
- Нужна admin UI для library templates (не реализована)
- Кастомные шаблоны пользователя либо выпадают из статистики, либо показываются как "Custom" без детализации
- Это продуктовое решение о том, разрешать ли пользователю создавать шаблоны вне library — должно быть принято на уровне product, не аналитики

## Решение

**Вариант A** — наименее инвазивный и наиболее универсальный. Не зависит от library, от LiteLLM, от архитектуры сервисов.

Вариант C — отдельная продуктовая история. Если library templates появятся, можно добавить `library_template_id` + `library_template_name` в `job_executions` рядом с `template_name` и использовать для группировки там, где нужен bounded label set.

## Что нужно сделать (Вариант A)

1. Миграция в template-service: добавить `template_name` в `job_executions`
2. При создании `JobExecution` записывать имя шаблона из контекста запуска
3. Обновить analytics view и `GenerationSpendLog` entity, если `template_name` нужен в spend-аналитике
4. `GetGenerationVelocityQuery` и `GetSpendByTemplateQuery` начнут возвращать `TemplateName` вместо (или рядом с) `TemplateId`

## Связанные концепты

- [[analytics-data-layer]] — query handlers, которые используют template_id
- [Yield Efficiency](../../AMPLIFY-368/concepts/yield-efficiency.md) — основной потребитель per-template аналитики
- [Generation Velocity](../../AMPLIFY-368/concepts/generation-velocity.md) — второй потребитель per-template данных
