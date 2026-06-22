"""Reference consumer for an AI service.

Shows the full consume contract using the provided FrameBatchClient: pull a
use-case's batches off RabbitMQ, resolve the JPEG frames from Redis, and
**acknowledge** each batch so the StreamHandler's reference-counted cleanup can
delete it once every use-case on the camera has consumed it.

Run standalone (from the streamhandler/ dir, so `src` is importable):

    pip install pika redis numpy opencv-python-headless pydantic-settings pydantic pyyaml sqlalchemy
    PYTHONPATH=. python examples/consumer_example.py --usecase intrusion

This is illustrative, not part of the service runtime.
"""

from __future__ import annotations

import argparse

import cv2
import numpy as np

from src.client import FrameBatchClient


def decode_jpeg(buf: bytes) -> np.ndarray:
    return cv2.imdecode(np.frombuffer(buf, dtype=np.uint8), cv2.IMREAD_COLOR)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--usecase", required=True, help="use-case slug, e.g. 'intrusion'")
    parser.add_argument("--rabbitmq", default="amqp://guest:guest@localhost:5672/%2F")
    parser.add_argument("--redis", default="redis://localhost:6379/0")
    args = parser.parse_args()

    client = FrameBatchClient(
        usecase_slug=args.usecase,
        rabbitmq_url=args.rabbitmq,
        redis_url=args.redis,
    )
    print(f"Listening for use-case '{args.usecase}' …")

    try:
        for batch in client.consume():
            cam = batch.camera
            frames = batch.frames
            present = sum(1 for f in frames if f is not None)
            print(
                f"batch {batch.batch_id} | camera={cam.get('id')}({cam.get('name')}) "
                f"frames={present}/{len(frames)} roi={batch.roi.get('type')}"
            )

            for i, blob in enumerate(frames):
                if blob is None:
                    print(f"  frame {i}: MISSING (expired / already cleaned up)")
                    continue
                img = decode_jpeg(blob)
                # ... run inference here, applying `batch.roi` to the frame ...
                print(f"  frame {i}: {img.shape}")

            # Done with this batch → release our reference. Frames are deleted
            # from Redis only once *every* use-case on the camera has acked.
            remaining = client.ack(batch)
            print(f"  acked; {remaining} use-case(s) still to consume this batch")
    except KeyboardInterrupt:
        pass
    finally:
        client.close()


if __name__ == "__main__":
    main()
