# Research: AMPLIFY-416

## Overview

Баги AMPLIFY-416 — прямое следствие имплементации AMPLIFY-391 (аналитический дашборд). Все проблемы локализованы во фронтенде; бэкенд (`userservice` query handlers) работает корректно.

**Связи с предыдущими issues:**

| Issue | Роль |
|-------|------|
| [AMPLIFY-368](../AMPLIFY-368/plan.md) | Определил 9 метрик Zone 1, в т.ч. Capital Burn и CPA Efficiency. Баги 416 нарушают корректность именно этих метрик. |
| [AMPLIFY-391](../AMPLIFY-391/plan.md) | Реализовал дашборд. Все компоненты, содержащие баги, созданы в этом PR. |

## Root Cause Analysis

### Bug 1: Daily Avg делитель = 30

**Файл:** `GlobalAnalyticsSection.tsx:467`
```tsx
{ label: "Daily Avg", value: `$${(totalSpend / 30).toFixed(2)}` }
```
Делитель хардкодирован. При 7-дневном диапазоне показывает в 4.3× меньше реальной суточной нормы. При 30 днях совпадает "случайно".

### Bug 2: Capital Burn chart — только дни с данными

**Файл:** `GlobalCapitalBurnChart.tsx` (useMemo, byDate map)

Бэкенд `GetGlobalCapitalBurnQuery` возвращает GROUP BY (date, model) — только строки с `CostUsd > 0`. Фронт строит chart только из этих строк. Визуально: выбраны "Last 30 days", chart показывает 7 дней (первые 7 дней с расходами).

**Решение:** `eachDayOfInterval({ start: from, end: to })` → заполнить пустые дни нулями.

### Bug 3: CPA chart — неоднозначные метки

**Файл:** `GlobalAnalyticsSection.tsx:349`
```tsx
const day = new Date(d.date!).getDate();
```
При 90-дневном диапазоне числа дней повторяются (Apr 30, May 30 — оба "30"). Пользователь не может определить месяц по оси X.

Дополнительная timezone-проблема: `new Date("2025-06-07")` — UTC midnight. В timezone UTC-8 `.getDate()` вернёт 6 вместо 7.

### Bug 4: Статичные метки "Last 30 days"

**Файл:** `GlobalAnalyticsSection.tsx`
- Строка 418: `<KpiRow title="Financial · Last 30 days">`
- Строка 425: `sub="last 30 days"`
- Строка 465: `badge="Last 30 days"`

Все три — литеральные строки, не зависят от `range`.

### Bug 5: Одинаковые цвета в chart и легенде

**Два отдельных дефекта с единым симптомом:**

**5a. Легенда — хардкодированный rose:**
```tsx
color={burnData.find((d) => d.model === model) ? "oklch(0.65 0.24 18)" : "oklch(0.70 0.17 162)"}
```
Так как `burnTotals` строится из `burnData`, условие всегда true → все элементы легенды rose.

**5b. SVG gradient ID конфликт:**
Градиенты именуются `burn-grad-0`, `burn-grad-1` (по индексу). SVG IDs глобальны в DOM. Если:
- Компонент рендерится дважды (React StrictMode double-invoke)
- Порядок моделей меняется между рендерами

→ последний задеплоенный градиент перезаписывает первый, и все Area ссылаются на один и тот же цвет.

**5c. oklch в SVG stopColor:** все современные браузеры (Chrome 111+, Firefox 113+, Safari 15.4+) поддерживают oklch в SVG атрибутах. Не является источником бага.

### Verify 6: CPA формула

**Файл:** `GlobalAnalyticsSection.tsx:337`
```tsx
const avgCpa = completedJobs > 0 ? totalSpend / completedJobs : 0;
```
✅ **Pool method** — правильно. Total Spend ÷ Total Videos.

Для сравнения: среднее суточных CPA = `Σ(cost_day / jobs_day) / N` — неправильно, т.к. малообъёмные дни получают равный вес с высокообъёмными.

CPA chart (`cpaData`) показывает суточные CPA (тренд) — это нормально; KPI-карточка и InlineKpi используют pool method.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/date-zero-padding]] | Почему бэкенд не возвращает нули и как фронт компенсирует |
| [[concepts/model-color-hash]] | Детерминированная генерация цвета из имени модели через djb2-хэш |

## Open Questions

_Нет открытых вопросов — все root causes установлены._
