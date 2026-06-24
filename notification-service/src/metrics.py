import logging

from prometheus_client import Counter, Gauge, start_http_server

from src.config import settings

logger = logging.getLogger(__name__)

MESSAGES_RECEIVED = Counter("ns_messages_received_total", "Notification messages consumed")
ALERTS_CREATED = Counter("ns_alerts_created_total", "Alert rows created")
ALERTS_EXTENDED = Counter("ns_alerts_extended_total", "Existing alerts extended (is_new=false)")
DELIVERIES = Counter("ns_deliveries_total", "Deliveries attempted", ["channel", "status"])
WS_PUBLISHED = Counter("ns_ws_published_total", "In-app messages published to Redis")
STAGE_ERRORS = Counter("ns_stage_errors_total", "Errors by pipeline stage", ["stage"])
ESCALATIONS_SCHEDULED = Counter("ns_escalations_scheduled_total", "Escalation steps scheduled")
ESCALATIONS_FIRED = Counter("ns_escalations_fired_total", "Escalation steps fired")
PENDING_ESCALATIONS = Gauge("ns_pending_escalations", "Escalation timers currently pending")


def start_metrics_server() -> None:
    if not settings.metrics_enabled:
        return
    start_http_server(settings.metrics_port)
    logger.info("Metrics server listening on :%s", settings.metrics_port)
