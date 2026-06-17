# Log: AMPLIFY-416

## 2026-06-15

Прочитал issue #416. Проанализировал root causes всех 5 багов и верификацию CPA формулы. Создана wiki: plan.md, research.md, concepts/date-zero-padding.md, concepts/model-color-hash.md. Все решения задокументированы до начала имплементации. Имплементация завершена: GlobalCapitalBurnChart.tsx переписан (hash-цвета, zero-padding, model-based gradient IDs, "Jun 7" метки); GlobalAnalyticsSection.tsx — dynamic period label, Daily Avg fix, legend colors, CPA date labels. TypeScript clean.
