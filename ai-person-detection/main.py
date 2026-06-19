"""ai-person-detection entrypoint.

Boots logging + metrics, builds the service (which loads the detector and
connects to Redis), and runs until SIGINT/SIGTERM triggers a graceful stop.
"""

from __future__ import annotations

import logging
import signal
import sys

from src.config import settings
from src.logging_config import setup_logging
from src.metrics import start_metrics_server
from src.service import PersonDetectionService


def main() -> int:
    setup_logging()
    logger = logging.getLogger(settings.service_name)
    logger.info("Starting %s (env=%s)", settings.service_name, settings.app_env)

    start_metrics_server()

    try:
        service = PersonDetectionService()
    except Exception:
        logger.exception("Failed to initialise service — aborting")
        return 1

    def _handle_signal(signum, _frame) -> None:
        logger.info("Received signal %s — stopping", signum)
        service.stop()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        service.run()
    except KeyboardInterrupt:
        service.stop()
    except Exception:
        logger.exception("Fatal error")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
