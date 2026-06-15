# AMPLIFY-416: Dashboard Bug Fixes — Capital Burn & CPA Charts

## Goal

Исправить 5 багов и верифицировать 1 формулу в аналитическом дашборде, реализованном в AMPLIFY-391.

## Context

Дашборд (`GlobalAnalyticsSection`, `GlobalCapitalBurnChart`, `GlobalCpaEfficiencyChart`) был создан в AMPLIFY-391 как основная имплементация метрик из AMPLIFY-368 (Zone 1). Баги найдены при ревью после деплоя.

**Затронутые файлы:**
- `frontend/src/features/analytics/components/GlobalAnalyticsSection.tsx` — KPI row, Daily Avg, легенда, метки периода
- `frontend/src/features/analytics/components/GlobalCapitalBurnChart.tsx` — stacked area chart с моделями
- `frontend/src/features/analytics/components/GlobalCpaEfficiencyChart.tsx` — line chart CPA

**Данные от бэкенда (userservice):**
- `GetGlobalCapitalBurnQuery` — возвращает только дни с реальными данными (без нулей)
- `GetGlobalOutputVolumeQuery` — аналогично, только дни с job_executions

## Design Decisions

### Цвета моделей — хэш от имени вместо fallback-массива

**Проблема:** хардкодированный массив из 3 fallback-цветов вызывает коллизии при > 3 моделях; цвет зависит от порядка сортировки (нестабильно). Семантические цвета (veo = rose и т.д.) были условностью макетов, в продукте не нужны.

**Решение:** djb2-хэш имени модели → hue в oklch(0.68 0.18 {hue}). Полностью автоматически, без эвристик `m.includes(...)`.

**Почему без библиотеки:** функция — 2 строки, никаких deps не нужно. Не требует обновления при появлении новых провайдеров.

### ID градиентов SVG — имя модели вместо индекса

**Проблема:** `burn-grad-0`, `burn-grad-1` — глобальные SVG IDs. При нескольких экземплярах компонента или при изменении порядка моделей между рендерами — ID конфликтуют, все `<Area>` получают одинаковый градиент.

**Решение:** `burn-grad-${model.replace(/[^a-zA-Z0-9]/g, "-")}` — уникальный и стабильный.

### Zero-padding дат в charts

**Проблема:** бэкенд возвращает только дни с данными. Для 30-дневного диапазона с активностью лишь в последние 7 дней — chart показывает 7 точек и пользователь думает что выбрал 7 дней.

**Решение:** в `GlobalCapitalBurnChart` добавляются пропсы `from: Date` и `to: Date`. В `useMemo` используется `eachDayOfInterval` из date-fns — генерируются все дни диапазона, missing days получают нулевые значения.

**CPA chart:** для CPA zero-padding не применяется (CPA неопределён при 0 jobs). Фиксируется только формат метки.

### Метки дат — "Jun 7" вместо "7"

**Проблема:** `new Date(dateStr).getDate()` → только число дня. При пересечении месяцев (90-дневный диапазон) метки повторяются: "30", "1", ..., "30", "1" — неоднозначно.

**Решение:** парсинг ISO-строки без `Date` объекта: `dateStr.split("-")` → `months[+m - 1] + " " + +d`. Формат "Jun 7" однозначен при любом диапазоне. Timezone-safe (не использует `Date`).

## Acceptance Criteria

- [ ] Bug 1: Daily Avg делитель — реальное кол-во дней диапазона, не 30
- [ ] Bug 2: Capital Burn chart — показывает полный диапазон (zero-padded)
- [ ] Bug 3: CPA Efficiency chart — метки дат корректны для многомесячных диапазонов
- [ ] Bug 4: Период label (badge, KPI row title, sub) — динамический
- [ ] Bug 5: Цвета моделей — хэш-детерминированные; легенда соответствует chart
- [ ] Verify 6: CPA формула — totalSpend / completedJobs (pool method), не avg daily CPAs ✅

## Out of Scope

- Бэкенд-изменения в query handlers (zero-padding дат решается на фронте)
- Остальные незавершённые метрики AMPLIFY-391 (Generation Velocity, Yield Efficiency, Format Volume Velocity)
- Производительность / materialized views
