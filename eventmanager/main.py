"""Event Manager entrypoint.

Boots logging + metrics, builds the manager (Redis/MinIO/DB/RabbitMQ wiring),
starts the receiver + worker threads, and runs until SIGINT/SIGTERM.
"""

from __future__ import annotations

import logging
import signal
import sys

from src.config import settings
from src.logging_config import setup_logging
from src.manager import EventManager
from src.metrics import start_metrics_server


def main() -> int:
    setup_logging()
    logger = logging.getLogger(settings.service_name)
    logger.info("Starting %s (env=%s)", settings.service_name, settings.app_env)

    start_metrics_server()

    try:
        manager = EventManager()
    except Exception:
        logger.exception("Failed to initialise Event Manager — aborting")
        return 1

    def _handle_signal(signum, _frame) -> None:
        logger.info("Received signal %s — stopping", signum)
        manager.shutdown()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        manager.run()
    except KeyboardInterrupt:
        manager.shutdown()
    except Exception:
        logger.exception("Fatal error")
        manager.shutdown()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
