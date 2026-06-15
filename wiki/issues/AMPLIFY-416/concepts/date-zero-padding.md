# Concept: Date Zero-Padding in Analytics Charts

## Проблема

Бэкенд (`GetGlobalCapitalBurnQuery`, `GetGlobalOutputVolumeQuery`) возвращает только дни с реальными данными:

```sql
-- GROUP BY date, model → только строки где есть события
```

Если за выбранные 30 дней активность была только последние 7 дней, бэкенд вернёт 7 строк. Фронт строит chart из этих 7 строк → X-ось показывает 7 точек, пользователь видит "7-дневный" диапазон при выборе "30 дней".

## Решение (фронт)

`GlobalCapitalBurnChart` получает `from: Date` и `to: Date` вместе с `data`.

В `useMemo`:
```ts
import { eachDayOfInterval, format } from "date-fns";

const allDays = eachDayOfInterval({ start: from, end: to });
const chartData = allDays.map((day) => {
  const key = format(day, "yyyy-MM-dd");
  const row = byDate.get(key) ?? {};  // пустой объект = нули для всех моделей
  return { date: shortLabel(key), ...row };
});
```

Результат: chart всегда отображает полный выбранный диапазон; дни без расходов показывают нулевую линию.

## Почему не на бэкенде

Добавление zero-padding на бэкенде (generate_series в SQL) требует передачи полного диапазона через SQL и усложняет query. Фронт уже знает `from`/`to` и имеет date-fns — компенсация на фронте проще и не затрагивает API контракт.

## CPA Chart — исключение

Для CPA Efficiency chart zero-padding не применяется: CPA = cost / completions неопределён при completions = 0. Показывать нуль или NaN было бы вводящим в заблуждение.

Фикс для CPA: только улучшение формата меток (см. [[model-color-hash]] — это другой концепт, но в том же PR).
