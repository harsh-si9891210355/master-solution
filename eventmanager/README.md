# Event Manager

A multi-threaded consumer/aggregator that turns the AI services' detection
events into **incidents with video evidence**. It consumes detection-event
batches from the use-case event queues, groups them into events using a
time-gap debounce, builds annotated video evidence, stores it on MinIO,
persists the event in Postgres, and pushes the event onto a notification queue.

```
<usecase>-event-queue ─(receiver thread each)─▶ in-memory Queue(maxsize=10000) ─▶ worker pool
   (RabbitMQ)                                      (backpressure buffer)            (analyse)
                                                                                       │
   frames from Redis ◀──────────────────────────────────────────────────────────────┤
                                                                                       ▼
                                   gap-vs-threshold debounce ──▶ extend event (no video)
                                                            └──▶ new event:
                                                                   decode frames → raw+processed
                                                                   OpenCV mp4 → ffmpeg H.264
                                                                   → MinIO → Postgres → notify queue
```

## Threading model

- **Receiver thread** (`recv_from_event_queue`) — one per input queue. Pulls a
  message (one batch = a JSON list of frame dicts), `put()`s it as a single item
  onto the bounded in-memory `queue.Queue`, then **acks** RabbitMQ. The blocking
  `put()` is the backpressure: when the buffer is full, the receiver stops
  acking and RabbitMQ stops delivering. No logic runs while a batch waits.
- **In-memory buffer** — `queue.Queue(maxsize=EM_QUEUE_MAXSIZE)` decouples fast
  RabbitMQ ingest from slow video building.
- **Analysis workers** (`analyse_queue_msgs`) — a pool of threads; each `get()`s
  one whole batch and runs the aggregator.

## Event grouping (time-gap debounce)

For each batch, the most recent event for the camera + use-case is looked up:

| Condition | Result |
|---|---|
| No prior event for camera + use-case | **New event + new video** |
| `gap = first_frame_time − last_event.event_end_time < threshold` | **Extend** — update `event_end_time` only, no video |
| `gap ≥ threshold` | **New event + new video** |

So fresh detections arriving within `EM_EVENT_GAP_THRESHOLD_S` of the last
event's end are treated as the same ongoing incident (only the end-time grows);
a larger quiet gap starts a new incident with fresh evidence. The video contains
only the **triggering batch's** frames — in-threshold follow-ups just push the
end-time forward. A per-(camera, use-case) lock makes the decide-and-write
atomic so concurrent workers can't create duplicate events.

## Building the evidence video

For a new event (`analyse_event`):

1. **Decode** each frame's raw image (inline base64 or fetched from Redis) and
   its processed image (inline base64, or rendered by drawing the AI detections
   onto the raw frame — red box for an in-ROI violation, green otherwise).
   Decode failures are skipped; if none decode, no video is built.
2. **OpenCV VideoWriter** writes a temp `.mp4` at `EM_VIDEO_FPS` (default 1),
   resizing each frame to `EM_EVIDENCE_WIDTH × EM_EVIDENCE_HEIGHT`. Raw and
   processed sequences become separate files.
3. **ffmpeg** re-encodes each to browser-playable H.264
   (`libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart`).
4. **MinIO** upload → stable public URL. `stream_quality` (per-message or
   `EM_DEFAULT_STREAM_QUALITY`) picks raw vs processed as the stored
   `evidence_url`.
5. **Postgres** `events` insert, then **notification** publish. Temp files are
   deleted.

## Input message contract

One RabbitMQ message = one batch:

```json
{
  "camera_id": 5,
  "location_id": 3,                 // optional; looked up from cameras if absent
  "usecase_id": 7,
  "usecase_slug": "walking-in-no-walking-zone",
  "stream_quality": "processed",    // optional; raw | processed
  "batch_id": "…",
  "frames": [
    {
      "capture_epoch_ms": 1718524800000,
      "redis_key": "sh:frames:5:<batch>",   // raw frame via claim-check …
      "field": "frame:0",
      "raw": "<base64>",                     // … or inline raw
      "processed": "<base64>",               // optional pre-annotated frame
      "detections": [                        // drawn onto raw if no processed image
        { "bbox": [340,210,420,540], "label": "person", "confidence": 0.91, "in_roi": true }
      ]
    }
  ]
}
```

`camera`/`usecase` nested objects (`{"id": …}`) are also accepted, so the
ai-person-detection event shape works once frame images/refs are included.

## Output

- **Postgres `events`**: `(camera_id, location_id, usecase_id, evidence_url,
  event_start_time, event_end_time)`.
- **Notification queue** (`EM_NOTIFICATION_QUEUE`, default `notification-queue`):
  a JSON event with `event_id`, camera/use-case/location, start/end times,
  `evidence_url` (+ `raw_url`/`processed_url`), and `is_new`.
- **MinIO** `evidence` bucket: `camera-<id>/usecase-<id>/<batch>-{raw,processed}.mp4`.

## Configuration

Environment-driven (prefix `EM_`); see [`.env.example`](.env.example). Notable:
`EM_INPUT_QUEUES` (comma-separated), `EM_ANALYSIS_WORKERS`, `EM_QUEUE_MAXSIZE`,
`EM_EVENT_GAP_THRESHOLD_S`, `EM_VIDEO_FPS`, `EM_EVIDENCE_WIDTH/HEIGHT`,
`EM_DEFAULT_STREAM_QUALITY`, and the MinIO/DB/Redis/RabbitMQ endpoints.

## Running

Wired into [`deployment-scripts/docker-compose.yml`](../deployment-scripts/docker-compose.yml)
alongside `minio`:

```bash
cp eventmanager/.env.example eventmanager/.env
cd deployment-scripts
docker compose up -d --build minio eventmanager
```

- MinIO console: http://localhost:9001 (minioadmin/minioadmin) — evidence bucket.
- Events land in the Postgres `events` table; notifications on `notification-queue`.

## Observability

Prometheus metrics on `:9107/metrics`: `em_batches_received_total`,
`em_batches_processed_total`, `em_events_created_total`, `em_events_extended_total`,
`em_videos_built_total`, `em_frames_decoded_total`, `em_minio_uploads_total`,
`em_notifications_published_total`, `em_stage_errors_total`,
`em_inmem_queue_depth`, `em_event_build_seconds`.

## Notes / production enhancements

- Receiver acks RabbitMQ *after* enqueueing to the in-memory buffer (per design),
  so buffered-but-unprocessed batches are lost on a hard crash — the buffer is a
  throughput decoupler, not a durability layer.
- A dead-letter queue for repeatedly-failing batches and presigned (vs public)
  MinIO URLs are natural hardening steps.
