# Frontend

Next.js 15 приложение с App Router, TypeScript, Tailwind CSS, shadcn/ui.

## Компоненты UI — строгий приоритет

Перед тем как создать любой UI-элемент, следуй этому порядку:

### 1. Сначала проверь уже установленные shadcn/ui компоненты
Загляни в `components/ui/` — там лежат все установленные компоненты.
Используй их напрямую, не оборачивай без необходимости.

### 2. Если нужного компонента нет — доустанови из shadcn/ui
Проверь, есть ли нужный компонент в библиотеке shadcn/ui:
https://ui.shadcn.com/docs/components

Для установки используй:
```bash
npx shadcn@latest add <component-name>
```

Примеры компонентов, которые стоит доустановить, а не писать руками:
`accordion`, `alert`, `avatar`, `badge`, `calendar`, `card`, `checkbox`,
`combobox`, `command`, `data-table`, `date-picker`, `dialog`, `drawer`,
`dropdown-menu`, `form`, `input`, `label`, `pagination`, `popover`,
`progress`, `radio-group`, `select`, `separator`, `sheet`, `skeleton`,
`slider`, `switch`, `table`, `tabs`, `textarea`, `toast`, `toggle`,
`tooltip`

### 3. Кастомный компонент — только в крайнем случае
Пиши кастомный компонент только если:
- shadcn/ui не предоставляет ничего близкого по функциональности
- Компонент содержит специфическую бизнес-логику, которую нельзя вынести отдельно

Если создаёшь кастомный компонент — по возможности **внутри используй shadcn/ui примитивы** (Button, Input и т.д.) вместо нативных HTML-элементов.

## Где лежат компоненты

```
frontend/
└── components/
    ├── ui/          # shadcn/ui компоненты — не редактируй вручную
    └── ...          # кастомные компоненты проекта
```

## Стиль кода

- Стили только через Tailwind CSS utility-классы, без CSS-in-JS и inline styles
- Для форм используй shadcn/ui `Form` + `react-hook-form` + `zod`
- Для уведомлений используй shadcn/ui `Sonner` или `Toast`, не самописные решения