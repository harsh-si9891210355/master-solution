"""StreamHandler service entrypoint.

Boots logging + metrics, builds the camera provider and manager, and runs until
a SIGINT/SIGTERM triggers a graceful shutdown (drain in-flight batches, stop
workers, close transports).
"""

from __future__ import annotations

import logging
import signal
import sys

from src.config import settings
from src.logging_config import setup_logging
from src.manager import StreamHandlerManager
from src.metrics import start_metrics_server
from src.sources.factory import create_provider


def main() -> int:
    setup_logging()
    logger = logging.getLogger("streamhandler")
    logger.info("Starting %s (env=%s)", settings.service_name, settings.app_env)

    start_metrics_server()

    try:
        provider = create_provider()
        manager = StreamHandlerManager(provider)
    except Exception:
        logger.exception("Failed to initialise StreamHandler — aborting")
        return 1

    def _handle_signal(signum, _frame) -> None:
        logger.info("Received signal %s — initiating graceful shutdown", signum)
        manager.shutdown()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    try:
        manager.run()
    except KeyboardInterrupt:
        manager.shutdown()
    except Exception:
        logger.exception("Fatal error in StreamHandler manager")
        manager.shutdown()
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
