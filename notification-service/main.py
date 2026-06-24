"""Notification service entrypoint."""

from __future__ import annotations

import logging
import signal
import sys

from src.config import settings
from src.consumer import NotificationConsumer
from src.logging_config import setup_logging
from src.metrics import start_metrics_server


def main() -> int:
    setup_logging()
    logger = logging.getLogger(settings.service_name)
    logger.info("Starting %s (env=%s)", settings.service_name, settings.app_env)

    start_metrics_server()

    try:
        consumer = NotificationConsumer()
    except Exception:
        logger.exception("Failed to initialise notification service — aborting")
        return 1

    def _handle_signal(signum, _frame) -> None:
        logger.info("Received signal %s — stopping", signum)
        consumer.shutdown()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        consumer.start()
    except KeyboardInterrupt:
        consumer.shutdown()
    except Exception:
        logger.exception("Fatal error")
        consumer.shutdown()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
