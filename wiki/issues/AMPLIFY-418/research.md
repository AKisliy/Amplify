# Research: AMPLIFY-418

## Overview

AMPLIFY-418 adds Telegram bot notifications for pipeline status updates.
The preferred architecture puts Telegram delivery inside `websocket-gateway`,
which already consumes all relevant RabbitMQ events and knows user connection state.
`websocket-gateway` is restructured from a single `Web` project to full Clean Architecture
(Domain / Application / Infrastructure / Web) matching the pattern in userservice and publisher.

**Two-level toggle system:**
- **Global** (per user, in ws-gateway DB): `notify_only_when_offline`, `notify_on_error`, `notify_on_hitl`, `notify_on_completion`, `notify_on_publication`
- **Per-node** (bool `notify` in node metadata → propagated into RabbitMQ message by template-service): overrides relevant global flag for that node

**No "category" abstraction**: each consumer knows its own flag and message text directly.
Toggle resolution: `bool? nodeOverride ?? globalFlag`.
Offline check: if `notify_only_when_offline = true`, check `IUserPresenceChecker.IsOnline(userId)` before sending.

**Telegram bot** hosted as webhook endpoint inside ws-gateway. Safe with multiple pods —
webhook is stateless HTTP, each update hits exactly one pod behind the LB.

**UI**: "Notifications" entry in sidebar footer user dropdown → `<Sheet>` with Telegram linking + 4 switches + delivery mode radio. Settings loaded on Sheet open (single GET), switches save immediately (PATCH).

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/ws-gateway-architecture]] | Clean Architecture restructure: 4 projects, file layout, key design notes |
| [[concepts/event-to-notification-mapping]] | Which RabbitMQ events map to which Telegram messages and global flag |
| [[concepts/telegram-linkage-flow]] | How a user links their Telegram account to the platform |
| [[concepts/two-level-toggle]] | Global (ws-gateway DB) vs per-node (graph metadata) toggle resolution |
| [[concepts/ui-notification-settings]] | Frontend: Sheet panel in sidebar footer dropdown, Telegram linking flow, component structure |

## Open Questions

- ~~What is "HF super computer"?~~ **Resolved**: non-applicable (agent MCP pattern vs our platform pattern).
- ~~Should `telegram_chat_id` live in userservice?~~ **Resolved**: ws-gateway owns `notification_settings` DB table.
- ~~Per-node toggle architecture?~~ **Resolved**: bool `notify` in node metadata → `bool? nodeOverride ?? globalFlag`.
- ~~Send notifications always or only when offline?~~ **Resolved**: user-controlled `notify_only_when_offline` flag.
- ~~UI placement?~~ **Resolved**: Sheet via sidebar footer user dropdown.
- ~~Multiple pods problem?~~ **Resolved**: webhook mode — stateless HTTP, no per-pod bot instance.
- ~~ws-gateway architecture?~~ **Resolved**: full Clean Architecture, see [[concepts/ws-gateway-architecture]].
- Does the bot need to support any commands beyond `/start` (e.g., `/stop`, `/status`)?
- What exactly does the per-node `notify` bool override — the single most relevant flag for that node type, or a generic "send any notification"?
