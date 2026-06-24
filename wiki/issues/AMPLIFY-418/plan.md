# AMPLIFY-418: Setup notifications for pipeline status updates

## Goal

Notify users about pipeline status updates via Telegram bot, with a two-level toggle system
(global flags in ws-gateway DB + per-node bool override in graph metadata),
delivered through `websocket-gateway`.

## Context

`websocket-gateway` is the existing integration point between RabbitMQ events and users.
It already consumes all relevant pipeline events (`NodeExecutionStatusChanged`, `GraphCompleted`,
`AssetRegistered`, `PublicationStatusChanged`) and knows which users are connected via SignalR.

Key pipeline events already on the bus:
- `NodeExecutionStatusChanged` (exchange: `node-status-changed`) — per-node progress; carries node metadata
- `GraphCompleted` (exchange: `graph-completed`) — execution done, asset being saved
- `AssetRegistered` (exchange: `asset-registered`) — asset saved, final "done" event
- `PublicationStatusChanged` (exchange: `publication-status-changed`) — social media publish result

Telegram delivery is preferred over in-browser notifications ("лучше в бота").

## Design Decisions

1. **Delivery via websocket-gateway**: Telegram notifications added to existing consumers
   rather than a new microservice. Gateway already has userId, event context, and connection
   state awareness. Conceptually the service is a notification hub — the "websocket" name is
   a misnomer; it handles both real-time (SignalR) and async (Telegram) delivery.
2. **Telegram as the notification channel**: not push/email. Telegram Bot API via bot token.
3. **Two-level toggle system**:
   - **Global flags** (stored in ws-gateway DB per user): `notify_on_error`, `notify_on_hitl`,
     `notify_on_completion`, `notify_on_publication`.
   - **Per-node override** (bool `notify` field in node metadata within the graph JSON,
     propagated into the RabbitMQ message by template-service). Overrides the relevant global
     flag for that specific node execution.
   - **Resolution**: `bool? nodeOverride ?? globalFlag` — one helper, no category abstraction.
4. **No "category" abstraction**: each consumer directly knows which global flag to check and
   what Telegram message to send. The consumer IS the mapping. No shared metadata, no
   in-memory dictionary, no reflection over attributes.
5. **telegram_chat_id and global toggles storage**: in ws-gateway's own PostgreSQL database,
   not in userservice. ws-gateway owns a `notification_settings` table keyed by `user_id`
   (string, no FK to userservice schema). ws-gateway uses EF Core to access its own schema.
6. **Notification trigger mode**: user-controlled setting `notify_only_when_offline` (bool,
   default `false`). If `true` — send Telegram only when the user has no active SignalR
   connection (ws-gateway checks `IHubContext` / connected user set). If `false` — always send.
   ws-gateway already has connection state awareness so the check is free.
7. **HF Supercomputer reference**: analyzed and deemed non-applicable. HF Supercomputer is an
   AI agent with MCP connectors (incl. Telegram) where users connect their own bot as a tool.
   Our pattern is platform-level: one platform bot, pipeline events trigger notifications automatically.

## Acceptance Criteria

- [ ] User can link their Telegram account (bot `/start` flow → saves `telegram_chat_id` in ws-gateway DB)
- [ ] ws-gateway has its own DB with `notification_settings` table:
      `user_id`, `telegram_chat_id`, `notify_only_when_offline`, `notify_on_error`, `notify_on_hitl`, `notify_on_completion`, `notify_on_publication`
- [ ] All settings are configurable per user (via API endpoint consumed by frontend settings page)
- [ ] When `notify_only_when_offline = true`: skip Telegram send if user has active SignalR connection
- [ ] Node metadata in graph JSON supports a per-node `notify` bool; template-service propagates it into `NodeExecutionStatusChanged` message
- [ ] Per-node `notify` overrides the relevant global flag when present (`bool? nodeOverride ?? globalFlag`)
- [ ] `AssetRegistered` consumer → sends Telegram message if `notify_on_completion` resolves to true
- [ ] `NodeExecutionStatusChanged` consumer → sends Telegram message on error if `notify_on_error` resolves to true; on HITL if `notify_on_hitl` resolves to true
- [ ] `PublicationStatusChanged` consumer → sends Telegram message on success if `notify_on_publication = true`
- [ ] If `telegram_chat_id` not set, notification silently skipped (no error)

## Out of Scope

- Email or push notifications
- Notification history / read receipts
- HITL expiry notification (tracked in AMPLIFY-419)
- Shared contracts library / deduplication of contract classes (separate concern)
