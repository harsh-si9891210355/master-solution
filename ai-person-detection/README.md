# ai-person-detection

A production-grade AI service for the Master Solution stack that performs
**person detection + "no-walking zone" analysis** on the frame batches produced
by the StreamHandler.

```
RabbitMQ queue                  Redis (claim-check)
walking-in-no-walking-zone  ──▶  fetch JPEG frames by key
        │  (envelope)                     │
        ▼                                  ▼
   ┌─────────────────────────────────────────────┐
   │  decode → YOLOv8n person detection → ROI test │
   └─────────────────────────────────────────────┘
        │ detailed analysis JSON          │ ack
        ▼                                 ▼
RabbitMQ queue                    RabbitMQ ack + Redis refcount ack
walking-in-no-walking-zone-event-queue
```

## What it does

1. **Consumes** frame-batch envelopes from the RabbitMQ queue
   `walking-in-no-walking-zone` (the StreamHandler's use-case queue).
2. **Fetches** the batch's JPEG frames from Redis using the claim-check
   reference in the envelope (or decodes inline frames if that transport is used).
3. **Detects people** in every frame with a lightweight model (YOLOv8n by
   default; an OpenCV HOG fallback needs no model download / torch).
4. **Analyses the ROI** — tests each person's foot point against the use-case's
   region of interest (the no-walking zone) and flags violations.
5. **Publishes** a detailed per-frame analysis event to
   `walking-in-no-walking-zone-event-queue`.
6. **Acknowledges** — RabbitMQ `basic_ack` (after the event is safely published)
   and the Redis reference-count ack (releasing the frames for cleanup).

## Output event (published to the event queue)

```json
{
  "schema_version": "1.0",
  "service": "ai-person-detection",
  "event_type": "person_detection",
  "batch_id": "…",
  "produced_at_ms": 1718524800000,
  "analyzed_at_ms": 1718524800123,
  "camera":  { "id": 5, "name": "Zone-3 Cam", "location": "…" },
  "usecase": { "id": 7, "name": "Walking in no-walking zone", "slug": "walking-in-no-walking-zone" },
  "roi":     { "type": "polygon", "points": [[0.1,0.2], …], "normalized": true },
  "model":   { "backend": "yolo", "weights": "yolov8n.pt", "device": "cpu", "confidence_threshold": 0.4 },
  "summary": {
    "frames_analyzed": 10, "frames_with_person": 7, "frames_with_violation": 3,
    "total_detections": 15, "max_persons_in_frame": 3, "violation": true,
    "processing_ms": 182.4
  },
  "frames": [
    {
      "index": 0, "seq": 1, "capture_epoch_ms": 1718524800000,
      "width": 1280, "height": 720,
      "person_count": 2, "persons_in_roi": 1, "violation": true,
      "detections": [
        { "bbox": [340,210,420,540], "confidence": 0.91, "label": "person",
          "in_roi": true, "reference_point": [380,540] }
      ],
      "error": null
    }
  ]
}
```

## Detectors

- **`yolo`** (default) — Ultralytics YOLOv8n. Accurate and fast; weights
  (`yolov8n.pt`, ~6 MB) auto-download on first run and are cached in the
  `ai-models` volume. Set `AI_DEVICE=cuda` to use a GPU.
- **`hog`** — OpenCV's built-in HOG+SVM pedestrian detector. No torch, no
  download, fully offline — handy for quick testing or constrained hosts; lower
  accuracy. Select with `AI_DETECTOR_BACKEND=hog`.

## Configuration

Environment-driven (prefix `AI_`); see [`.env.example`](.env.example). Key knobs:

| Variable | Default | Meaning |
|---|---|---|
| `AI_INPUT_QUEUE` | `walking-in-no-walking-zone` | Queue of frame batches to analyse |
| `AI_OUTPUT_QUEUE` | `walking-in-no-walking-zone-event-queue` | Queue for analysis events |
| `AI_DETECTOR_BACKEND` | `yolo` | `yolo` \| `hog` |
| `AI_MODEL_WEIGHTS` | `yolov8n.pt` | YOLO weights name or path |
| `AI_DEVICE` | `cpu` | `cpu` \| `cuda` |
| `AI_CONFIDENCE_THRESHOLD` | `0.4` | Min detection confidence |
| `AI_ROI_REFERENCE_POINT` | `foot` | `foot` (bbox bottom-centre) \| `center` |
| `AI_PREFETCH` | `4` | Unacked batches in flight |

## Delivery semantics

At-least-once: the input message is RabbitMQ-acked **only after** the analysis
event is published (broker-confirmed), so a crash causes a redelivery, not a
loss. The Redis frames are released last, after the ack. A crash between publish
and ack can re-emit one duplicate event — downstream consumers should treat
`batch_id` as the idempotency key. Data errors (corrupt frame, decode failure)
are dropped (`nack`, no requeue) to avoid poison-message loops; a dead-letter
queue is the natural production enhancement.

## Running

Wired into [`deployment-scripts/docker-compose.yml`](../deployment-scripts/docker-compose.yml):

```bash
cp ai-person-detection/.env.example ai-person-detection/.env
cd deployment-scripts
docker compose up -d --build redis rabbitmq ai-person-detection
```

It will idle until the StreamHandler publishes batches to the
`walking-in-no-walking-zone` queue. Watch results:

```bash
docker compose logs -f ai-person-detection          # per-batch summaries
# inspect the event queue in the RabbitMQ UI: http://localhost:15672 (guest/guest)
```

## Observability

Prometheus metrics on `:9106/metrics`: `aipd_batches_consumed_total`,
`aipd_frames_analyzed_total`, `aipd_persons_detected_total`,
`aipd_zone_violations_total`, `aipd_events_published_total`,
`aipd_frames_missing_total`, `aipd_inference_seconds`, `aipd_batch_seconds`,
`aipd_broker_connected`.
