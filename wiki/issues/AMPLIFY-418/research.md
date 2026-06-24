# Research: AMPLIFY-418

## Overview

AMPLIFY-418 adds Telegram bot notifications for pipeline status updates.
The preferred architecture puts Telegram delivery inside `websocket-gateway`,
which already consumes all relevant RabbitMQ events and knows user connection state.
`websocket-gateway` conceptually becomes a notification hub (SignalR + Telegram),
and gets its own PostgreSQL DB to store notification settings.

**Two-level toggle system:**
- **Global** (per user, in ws-gateway DB): `notify_only_when_offline`, `notify_on_error`, `notify_on_hitl`, `notify_on_completion`, `notify_on_publication`
- **Per-node** (bool `notify` in node metadata → propagated into RabbitMQ message by template-service): overrides relevant global flag for that node

**No "category" abstraction**: each consumer knows its own flag and message text directly.
Toggle resolution: `bool? nodeOverride ?? globalFlag`.
Offline check: if `notify_only_when_offline = true`, skip send when user has active SignalR connection.

**UI**: "Notifications" entry in sidebar footer user dropdown → `<Sheet>` with Telegram linking + 4 switches + delivery mode radio.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/event-to-notification-mapping]] | Which RabbitMQ events map to which Telegram messages and global flag |
| [[concepts/telegram-linkage-flow]] | How a user links their Telegram account to the platform |
| [[concepts/two-level-toggle]] | Global (ws-gateway DB) vs per-node (graph metadata) toggle resolution |
| [[concepts/ui-notification-settings]] | Frontend: Sheet panel in sidebar footer dropdown, Telegram linking flow, component structure |

## Open Questions

- ~~What is "HF super computer"?~~ **Resolved**: HF Supercomputer — AI-агент с MCP-коннекторами. Нерелевантно: у нас платформенный паттерн.
- ~~Should `telegram_chat_id` live in userservice?~~ **Resolved**: ws-gateway owns `notification_settings` DB table.
- ~~Per-node toggle architecture?~~ **Resolved**: bool `notify` in node metadata → `bool? nodeOverride ?? globalFlag`.
- ~~Send notifications always or only when offline?~~ **Resolved**: user-controlled `notify_only_when_offline` flag.
- ~~UI placement?~~ **Resolved**: Sheet via sidebar footer user dropdown. See [[concepts/ui-notification-settings]].
- Does the bot need to support any commands beyond `/start` (e.g., `/stop`, `/status`)?
- What exactly does the per-node `notify` field override — completion only, or any relevant flag for that node?
