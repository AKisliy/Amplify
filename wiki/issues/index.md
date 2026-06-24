# Issues Index

> One row per issue. Updated when a plan is committed and when a PR merges.
> For a full timeline across all issues: `grep "^## " wiki/issues/*/log.md`

| Issue                              | Summary                                              | Status      | Key decision                                                                                          |
| ---------------------------------- | ---------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| [AMPLIFY-368](AMPLIFY-368/plan.md) | Tracking data points — dashboard research            | In progress | Research phase; implementation pending                                                                |
| [AMPLIFY-391](AMPLIFY-391/plan.md) | LiteLLM POC — AI cost tracking + analytics dashboard | In progress | Pass-through proxy; cross-schema SQL view; analytics in userservice                                   |
| [AMPLIFY-409](AMPLIFY-409/plan.md) | ElevenLabs speech-to-speech pass-through via LiteLLM | Done        | 403 фиксится добавлением wildcard в Available Routes конкретного API-ключа (не в конфиге сервера)     |
| [AMPLIFY-411](AMPLIFY-411/plan.md) | Tune ElevenLabs voice output format                  | In progress | Upgrade default from `mp3_22050_32` to `mp3_44100_128`; expose as optional param                      |
| [AMPLIFY-416](AMPLIFY-416/plan.md) | Dashboard bug fixes — Capital Burn & CPA charts      | In progress | Hash-based model colors; zero-pad missing dates on frontend; dynamic period labels                    |
| [AMPLIFY-418](AMPLIFY-418/plan.md) | Telegram notifications for pipeline status updates   | In progress | Delivery via ws-gateway; per-node toggle; ws-gateway owns notification_settings DB                    |
| [AMPLIFY-419](AMPLIFY-419/plan.md) | Temporal-based job execution engine                  | In progress | Full ComfyUI replacement; nodes as Temporal activities; DAG via topological batches; HITL via signals |
