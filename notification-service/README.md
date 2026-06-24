# Notification Service

Consumes built events from RabbitMQ `notification-queue` (published by the
`eventmanager`) and turns them into user-facing **alerts** delivered in real time.

## Pipeline

```
notification-queue → consume → classify {severity, category} → persist Alert
  → fan out to recipients (per notification_preferences):
       • IN_APP   → Redis PUBLISH alerts:user:<id> → backend WebSocket → browser
       • WEB_PUSH → VAPID (pywebpush); dead endpoints pruned on 404/410
       • EMAIL    → SMTP
  → write a notification_deliveries audit row per (alert × channel × user)
  → schedule escalation (Redis ZSET) if an enabled rule matches
```

* `is_new=false` messages **extend** the existing alert (bump `occurrence_count`
  and end-time) and do not re-notify — this collapses alert storms.
* Deliveries are **idempotent** on `{alert_id}:{channel}:{user_id}`, so RabbitMQ
  at-least-once redelivery never double-sends.
* **Escalation** is acknowledgement-driven: a scheduled step fires only if the
  alert is still `NEW`. Acknowledging it (backend `POST /alert/{id}/acknowledge`)
  flips the status, so the step is skipped — cancellation is implicit.

## Config

All env vars use the `NS_` prefix — see [.env](.env). Shares Postgres, Redis and
RabbitMQ with the rest of the stack. Generate a VAPID keypair and set
`NS_VAPID_PUBLIC_KEY` / `NS_VAPID_PRIVATE_KEY` (the public key also goes in the
backend `.env`).

Metrics are exposed on `:9108/metrics` (`ns_*`).
