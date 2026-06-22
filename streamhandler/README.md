# StreamHandler

RTSP frame-ingestion service for the Master Solution stack. It connects to
camera RTSP streams, decodes and downsizes frames, encodes them to JPEG,
batches them with camera / use-case / ROI metadata, and pushes each batch onto a
**per-use-case queue** so downstream AI services can consume the frames they
care about.

```
RTSP camera ──▶ GStreamer/OpenCV decode ──▶ FPS throttle ──▶ resize + JPEG
                                                                   │
                                                          batch of N frames
                                                                   │
                              ┌────────────────────────────────────┴───────────┐
                              ▼ (frames, claim-check)                            ▼ (envelope)
                         Redis hash (TTL)                       RabbitMQ queue per use-case
                              ▲                                    queue = <usecase-slug>
                              │                                            │
                              └──────────── AI service consumes ───────────┘
                                   (read envelope, HMGET frames by key)
```

One `StreamWorker` runs per camera in its own thread, supervised by a
`StreamHandlerManager` that reconciles the running workers against the camera
source (so cameras hot-reload without a restart).

## Why Redis *and* RabbitMQ (claim-check)

JPEG batches are large and binary; routing them through the broker bloats it and
slows consumers. Instead:

- **Redis** stores each batch's frames once, under a single hash with a TTL
  (the "claim check"). The TTL guarantees frames self-evict if no consumer reads
  them — a dead AI service can never grow Redis unbounded.
- **RabbitMQ** carries a compact JSON **envelope** to a durable queue per
  use-case (the queue is named after the use-case slug, e.g. `intrusion`),
  referencing the same Redis key. The producer
  declares and binds each queue, so messages **accumulate in the durable queue
  while a use-case's AI service is offline** and are delivered when it
  reconnects; multiple services each consume at their own pace.

Frames are published to a durable **direct exchange** (`frames`) with the
use-case id as the routing key; each per-use-case queue is bound to that key.

Because the ROI is sent as *metadata* (frames are not cropped), one stored copy
of each frame batch is shared across all use-cases watching a camera. Set
`SH_FRAME_TRANSPORT=inline` to embed base64 JPEGs directly in the queue message
and drop the Redis dependency (simpler, for low-FPS / small-frame setups).

### Cleanup: reference-counted, not just TTL (`SH_REDIS_CLEANUP`)

A TTL alone can't distinguish "consumed" from "abandoned". So by default
(`SH_REDIS_CLEANUP=refcount`) each stored batch carries an **ack counter** in a
single field of the batch hash (`meta:acks_remaining`), seeded with the number
of use-cases the batch is published to. Each AI service **acks** after fetching
(`FrameBatchClient.ack(...)`), which decrements that counter; when it reaches
zero — i.e. the *last* use-case has consumed the batch — the whole batch is
deleted immediately, rather than lingering until the TTL.

- One counter, inside the batch: 4 use-cases → 4 → 3 → 2 → 1 → 0 → deleted.
  No separate key.
- The decrement-and-maybe-delete runs as a single Lua script (`HINCRBY` then,
  at zero, `DEL`), so concurrent acks from different services can't race.
- The TTL is kept purely as a **backstop**: if a consumer crashes and never
  acks, its frames still self-evict after `SH_REDIS_FRAME_TTL_S`. Set that a bit
  above your worst-case processing lag.
- The counter expects exactly one ack per use-case. A duplicate ack (e.g. an
  at-least-once queue redelivery to the same use-case) would over-decrement, so
  ack once per batch after committing offsets; the TTL bounds the blast radius.

Set `SH_REDIS_CLEANUP=ttl` to disable acks and rely solely on expiry.

## Configuration

Everything is environment-driven (prefix `SH_`); see [`.env.example`](.env.example).
The frequently-tuned knobs:

| Variable | Default | Meaning |
|---|---|---|
| `SH_TARGET_FPS` | `5` | Output sampling rate (decimated from source) |
| `SH_FRAME_WIDTH` / `SH_FRAME_HEIGHT` | `1280` / `720` | Output resolution (`0` = keep source) |
| `SH_FRAME_KEEP_ASPECT` | `true` | Letterbox instead of stretch |
| `SH_JPEG_QUALITY` | `80` | JPEG quality 1–100 |
| `SH_BATCH_SIZE` | `10` | Frames per batch |
| `SH_BATCH_MAX_AGE_S` | `5` | Flush a partial batch after this long |
| `SH_DECODER_BACKEND` | `auto` | `auto` \| `gstreamer` \| `opencv` |
| `SH_FRAME_TRANSPORT` | `claim_check` | `claim_check` \| `inline` |
| `SH_CAMERA_SOURCE` | `database` | `database` (Postgres) \| `static` (YAML) |
| `SH_RABBITMQ_QUEUE_TEMPLATE` | `{usecase_slug}` | Queue name per use-case (`{usecase_id}` also available) |

Per-camera overrides (FPS / resolution / quality) are supported in the camera
source and layered on top of these defaults.

## Camera sources

- **`database`** (default) — read straight from the existing Master Solution
  Postgres schema (`cameras` + `camera_usecase` + `usecases`), so the fleet
  stays in sync with the main app with no duplicate config to maintain. Only
  active cameras (`status = true`) that have an RTSP URL and at least one active
  use-case binding (`camera_usecase.is_active = true`, `usecases.status = true`)
  are streamed. The schema has no ROI column, so ROIs come from an optional JSON
  overlay (`SH_ROI_OVERLAY_FILE`) keyed `"<camera_id>:<usecase_id>"`; pairings
  without an entry default to full-frame.
- **`static`** — read from a YAML file ([`cameras.example.yaml`](cameras.example.yaml))
  instead. Copy it to `cameras.yaml` and fill in your RTSP URLs, use-cases and ROIs.

Both sources are re-read every `SH_RELOAD_INTERVAL_S` to add/remove/reconfigure
cameras at runtime.

## Decoders

- **GStreamer** (preferred): `rtspsrc ! decodebin ! videoconvert ! videoscale !
  appsink`, scaling in-pipeline; `decodebin` auto-selects a hardware decoder
  (nvdec/vaapi) when the plugin is installed.
- **OpenCV** (`cv2.VideoCapture`, FFmpeg backend): portable fallback, used
  automatically when GStreamer's Python bindings aren't available.

## Queue envelope

Each queue message is JSON:

```json
{
  "schema_version": "1.0",
  "batch_id": "…",
  "produced_at_ms": 1718524800000,
  "camera":  {"id": 1, "name": "Lobby", "location": "HQ", "codec": "h264", "source_resolution": "1920x1080"},
  "usecase": {"id": 101, "name": "Intrusion Detection", "slug": "intrusion"},
  "roi":     {"type": "polygon", "points": [[0.1,0.2],[0.9,0.2],[0.9,0.95],[0.1,0.95]], "normalized": true},
  "frames":  {
    "count": 10, "encoding": "jpeg", "width": 1280, "height": 720,
    "transport": "claim_check",
    "redis_key": "sh:frames:1:<batch_id>",
    "fields": ["frame:0", "…", "frame:9"],
    "cleanup": "refcount",
    "ack_required": true,
    "meta": [{"seq": 1, "capture_epoch_ms": 1718524800000, "width": 1280, "height": 720}]
  }
}
```

See [`examples/consumer_example.py`](examples/consumer_example.py) for a working
AI-service consumer.

## Running

### With docker-compose (recommended)

`redis`, `rabbitmq` and `streamhandler` are wired into
[`deployment-scripts/docker-compose.yml`](../deployment-scripts/docker-compose.yml):

```bash
cp streamhandler/.env.example streamhandler/.env   # cameras come from the DB by default
cd deployment-scripts
docker compose up -d --build redis rabbitmq streamhandler
```

The compose file pins `SH_CAMERA_SOURCE=database` and the DB URL for the
`streamhandler` service, so cameras are read from the shared Postgres schema —
no `cameras.yaml` needed. (Only set up `cameras.yaml` if you switch to
`SH_CAMERA_SOURCE=static`.)

### Locally

```bash
cd streamhandler
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # point SH_REDIS_URL / SH_RABBITMQ_URL at your brokers
cp cameras.example.yaml cameras.yaml
python main.py
```

## Observability

- **RabbitMQ management UI** — http://localhost:15672 (guest/guest): per-use-case
  queues, message rates, depth, and how many messages are piling up for an
  offline consumer.
- **RedisInsight** — http://localhost:5540: the `sh:frames:*` batch hashes, their
  ack counters and TTLs.
- **Prometheus metrics** on `:9105/metrics` (scrape job `streamhandler` already
  added): `sh_frames_decoded_total`, `sh_frames_published_total`,
  `sh_frames_dropped_total`, `sh_batches_published_total`, `sh_stream_up`,
  `sh_stream_reconnects_total`, `sh_encode_latency_seconds`,
  `sh_publish_latency_seconds`, `sh_active_workers`.
