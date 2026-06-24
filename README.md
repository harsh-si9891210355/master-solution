# Master Solution

An end-to-end video analytics platform. Camera RTSP streams are ingested,
decoded and batched, analysed by AI use-case detectors, grouped into events with
annotated video evidence, and surfaced in a web UI with full observability.

```
RTSP camera ─▶ StreamHandler ─▶ RabbitMQ (per use-case) ─▶ AI detectors ─▶ event queues
                   │  (frames)                                                   │
                   ▼                                                             ▼
                 Redis  ◀───────────── frames (claim-check) ──────────── Event Manager
                                                                              │
                                          MinIO (evidence video) ◀────────────┤
                                          Postgres (events)      ◀────────────┤
                                          Notification queue     ◀────────────┘
                                                                              ▼
                                                  Frontend (events, live, dashboards)
```

Services: **backend** (FastAPI), **frontend** (React), **streamhandler**,
**ai-person-detection**, **eventmanager**, **MediaMTX** (live/playback),
**Postgres**, **Redis**, **RabbitMQ**, **MinIO**, and a **Prometheus + Grafana +
Loki** monitoring stack.

---

## 1. Prerequisites

- Docker + Docker Compose v2
- ~8 GB free RAM (the full stack incl. AI + monitoring)
- (Optional) VLC, to publish a test RTSP stream from a video file

## 2. One-time setup

Each Python service reads a `.env` file. Create them from the provided examples:

```bash
cd "/home/piyush/Desktop/Master Solution/master-solution"

cp backend/.env.example              backend/.env             2>/dev/null || true
cp streamhandler/.env.example        streamhandler/.env
cp ai-person-detection/.env.example  ai-person-detection/.env
cp eventmanager/.env.example         eventmanager/.env
```

The in-compose wiring already points each service at the right DB / Redis /
RabbitMQ / MinIO host, so the defaults work as-is.

## 3. Start the application

```bash
cd deployment-scripts
sudo docker compose up -d --build
```

First build takes a while (the AI service pulls PyTorch + YOLOv8 weights).
Check everything is healthy:

```bash
sudo docker compose ps
sudo docker compose logs -f streamhandler ai-person-detection eventmanager
```

Stop / reset:

```bash
sudo docker compose down            # stop
sudo docker compose down -v         # stop + wipe volumes (DB, MinIO, etc.)
```

## 4. Access & credentials

| Service | URL | Credentials |
|---|---|---|
| **Frontend (web app)** | http://localhost:8080 | `superadmin@visionx.com` / `SuperAdmin@123` |
| Backend API (Swagger) | http://localhost:8000/docs | — (bearer token from login) |
| **Grafana** (dashboards) | http://localhost:3000 | `admin` / `admin` |
| **RabbitMQ** (mgmt UI) | http://localhost:15672 | `guest` / `guest` |
| **Redis** (RedisInsight) | http://localhost:5540 | add DB → host `redis`, port `6379` (no password) |
| **MinIO** (evidence store) | http://localhost:9001 | `minioadmin` / `minioadmin` |
| Prometheus | http://localhost:9090 | — |

Service metrics (scraped by Prometheus): streamhandler `:9105`,
ai-person-detection `:9106`, eventmanager `:9107`, MediaMTX `:9998`.

> **Redis** has no password (dev). In RedisInsight, "Add Redis database" with
> host `redis` and port `6379` (the services share the Docker network); frame
> batches appear under keys `sh:frames:*`.

---

## 5. Create a test RTSP stream from a video file

No physical camera? Publish a looping video as an RTSP stream with VLC.

First, find your machine's LAN IP (use this, **not** `localhost` — the
StreamHandler runs in a container and must reach the host over the network):

```bash
hostname -I        # e.g. 192.168.1.104
```

Then publish the video (loops forever):

```bash
vlc -vvv /home/piyush/Downloads/event_video.mp4 \
    --sout '#rtp{sdp=rtsp://:3001/stream}' --loop
```

The stream is now available at:

```
rtsp://<your-ip>:3001/stream      # e.g. rtsp://192.168.1.104:3001/stream
```

Leave VLC running while you test.

---

## 6. Add the camera, use-case and ROI in the UI

1. Open the frontend at **http://localhost:8080** and log in as the super admin
   (`superadmin@visionx.com` / `SuperAdmin@123`).
2. Go to **Cameras → Add Camera** and fill in the details, setting the RTSP URL to
   your VLC stream:
   ```
   rtsp://192.168.1.104:3001/stream      # use YOUR `hostname -I` value
   ```
   Pick a location, codec (`h264`), resolution and FPS, then **Save**.
3. On the camera, **attach the "Walking in No Walking Zone" use-case** (and any
   others you want) and make sure it is **active**.
4. Open the **ROI editor** for the camera, **draw the ROI** (rectangle or
   polygon) over the no-walking area, **assign it to the "Walking in No Walking
   Zone" use-case**, and **Save**.

Within a few seconds the StreamHandler picks up the camera (it re-reads the DB
periodically), starts decoding frames, and the pipeline begins flowing:

- frames → `walking-in-no-walking-zone` queue → ai-person-detection
- detections → `walking-in-no-walking-zone-event-queue` → Event Manager
- the Event Manager builds an annotated evidence video (ROI overlay + detection
  boxes + camera/location/timestamp banner), stores it on MinIO, and persists
  the event.

## 7. See it working

- **Events page** (frontend) — lists generated events; click **View** to open the
  event detail with the **evidence video**.
- **RabbitMQ UI** (http://localhost:15672) — watch the `walking-in-no-walking-zone`
  and `*-event-queue` queues fill and drain.
- **RedisInsight** (http://localhost:5540) — `sh:frames:*` batches appearing and
  clearing as they're consumed.
- **MinIO** (http://localhost:9001) — evidence videos under the `evidence` bucket.
- **Grafana** (http://localhost:3000) — fleet, backend and pipeline dashboards.

> **No new events?** The Event Manager debounces: detections arriving within
> `EM_EVENT_GAP_THRESHOLD_S` (default 30s) of the last event's end **extend** the
> existing event instead of creating a new one. A genuinely new incident (a quiet
> gap, or after the current one ends) creates a fresh event + video.

---

## Service docs

- [streamhandler/README.md](streamhandler/README.md) — RTSP → JPEG → Redis/RabbitMQ
- [ai-person-detection/README.md](ai-person-detection/README.md) — person detection + ROI analysis
- [eventmanager/README.md](eventmanager/README.md) — event aggregation + evidence video
 