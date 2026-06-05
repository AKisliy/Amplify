# Concept: Global Analytics Dashboard

## Расположение

`frontend/src/features/analytics/` — все компоненты и хуки.

Дашборд рендерится в `app/(protected)/dashboard/page.tsx` через `<GlobalAnalyticsSection>`.

## Layout (6 блоков)

```
┌─────────────────────────────────────────────────┐
│  Hero greeting + New Project button              │
├─────────────────────────────────────────────────┤
│  Operational KPIs (4 карточки: Projects /        │
│  Templates / Autolists / Connections)            │
├─────────────────────────────────────────────────┤
│  Financial KPIs (4 карточки: Total Spend /       │
│  Avg CPA / Videos Generated / Arbitrage Margin) │
├─────────────────────────────────────────────────┤
│  Capital Burn (full width — stacked area chart) │
├───────────────────────────┬─────────────────────┤
│  CPA Efficiency (1.5fr)   │ Output Volume (1fr) │
│  линейный chart +         │ weekly bar chart    │
│  baseline slider          │ completed + failed  │
├─────────────────────────────────────────────────┤
│  Your Projects (grid карточек с mini-stats)     │
├─────────────────────────────────────────────────┤
│  Project Efficiency (full width — bar + line)   │
└─────────────────────────────────────────────────┘
```

## Компоненты

| Файл | Описание |
|------|----------|
| `GlobalAnalyticsSection.tsx` | Корневой компонент. Управляет DateRange, baseline, вызывает все хуки |
| `GlobalCapitalBurnChart.tsx` | Stacked AreaChart (recharts). Цвета: veo→rose, elevenlabs→sky, openai/whisper→emerald |
| `GlobalCpaEfficiencyChart.tsx` | LineChart с `ReferenceArea` (savings zone) и `ReferenceLine` (baseline). Inline-слайдер baseline |
| `GlobalOutputVolumeChart.tsx` | Stacked BarChart по ISO-неделям (Monday-aligned grouping) |
| `GlobalEntityEfficiencyChart.tsx` | ComposedChart: Bar (avgCpa, colored by good/bad) + Line (totalCostUsd, right Y-axis) |

## Хуки (`useGlobalAnalytics.ts`)

| Хук | Endpoint | Данные |
|-----|----------|--------|
| `useGlobalSpendSummary` | `global/spend/summary` | KPI-значения: totalCostUsd, completedJobCount, failedJobCount |
| `useGlobalSpendTrend` | `global/spend/trend` | Дневные затраты для CPA join |
| `useGlobalOutputVolume` | `global/jobs/volume` | Дневные completed/failed для Output Volume chart |
| `useGlobalCapitalBurn` | `global/capital-burn` | (date, model, cost) для Capital Burn chart |
| `useEntityEfficiency` | `global/entity-efficiency` | Per-project данные для Entity Efficiency и Project cards |

## KPI-значения: fallback-логика

`summary` endpoint (и его handler) может вернуть null при ошибке. Значения в карточках вычисляются с fallback на агрегацию chart data:

```ts
const totalSpend    = summary?.totalCostUsd      ?? burnData.reduce(...)
const completedJobs = summary?.completedJobCount ?? volumeData.reduce(...)
const failedJobs    = summary?.failedJobCount    ?? volumeData.reduce(...)
```

Это гарантирует, что KPI-inline в заголовках карточек не показывают нули, когда chart-данные уже загружены.

## CPA Efficiency

`cpaData` не приходит с бэкенда — вычисляется на фронте:

```ts
// join SpendTrend (daily cost) + OutputVolume (daily completed) по дате
cpa = costByDate.get(date) / completedJobs
```

## Human Baseline

Хранится в `localStorage` под ключом `amp.humanBaseline` (default: $15.00). Inline-слайдер в `GlobalCpaEfficiencyChart` — `mouseUp`/`touchEnd` для персистенции (не `onChange`, чтобы не спамить localStorage).

## Палитра (design system tokens)

```ts
const PALETTE = {
  rose:    "oklch(0.65 0.24 18)",    // Veo / Google
  sky:     "oklch(0.66 0.16 230)",   // ElevenLabs
  emerald: "oklch(0.70 0.17 162)",   // OpenAI / Whisper
  primary: "oklch(0.62 0.21 264)",
  amber:   "oklch(0.78 0.17 75)",
  violet:  "oklch(0.65 0.24 295)",
}
```

Цвет модели в Capital Burn определяется `slotColor(model, fallbackIdx)` по паттерн-матчу имени модели.

## Связь с AMPLIFY-368

Каждый компонент дашборда реализует конкретный концепт из исследовательской фазы:

| Компонент | AMPLIFY-368 Concept |
|---|---|
| `GlobalCapitalBurnChart` | [Capital Burn](../../AMPLIFY-368/concepts/capital-burn.md) — top drain identification, stacked by model |
| `GlobalCpaEfficiencyChart` | [CPA](../../AMPLIFY-368/concepts/cpa.md) — human baseline + arbitrage margin visualization |
| `GlobalOutputVolumeChart` | [Output Volume Velocity](../../AMPLIFY-368/concepts/output-volume-velocity.md) — weekly throughput |
| `GlobalEntityEfficiencyChart` | [Entity Efficiency](../../AMPLIFY-368/concepts/entity-efficiency.md) — CPA per project + spend allocation |
| Financial KPI: Avg CPA + Arbitrage | [CPA](../../AMPLIFY-368/concepts/cpa.md) — trailing average vs baseline |
| Project perf mini-cards | [Entity Efficiency](../../AMPLIFY-368/concepts/entity-efficiency.md) — quick per-project snapshot |

**Не реализованы в этом PR:**
- [Generation Velocity](../../AMPLIFY-368/concepts/generation-velocity.md) — per-project handler есть (`GetGenerationVelocityQuery`), но нет global handler и нет компонента. Resource Offset (hours saved) не визуализирован.
- [Yield Efficiency](../../AMPLIFY-368/concepts/yield-efficiency.md) — per-project handler есть (`GetSpendByTemplateQuery`), но нет chart с CPA per template на глобальном дашборде.
- [Format Volume Velocity](../../AMPLIFY-368/concepts/format-volume-velocity.md) — нет ни handler, ни компонента.

## Recharts TypeScript gotcha

Тип `formatter` в `<Tooltip>` и `<LabelList>` принимает `ValueType | undefined`, не `number`. Явные аннотации `(v: number) => ...` не компилируются. Нужен guard:

```ts
formatter={(value, name) => [
  typeof value === "number" ? `$${value.toFixed(2)}` : String(value),
  ...
]}
```
