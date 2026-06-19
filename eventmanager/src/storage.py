"""MinIO object storage for evidence videos.

On startup the bucket is created if missing and given a public read-only policy,
so the stored evidence_url is a stable, directly-playable link
(<public_url>/<bucket>/<object>) rather than an expiring presigned URL.
"""

from __future__ import annotations

import json
import logging

from minio import Minio

from src.config import settings

logger = logging.getLogger(__name__)


def _public_read_policy(bucket: str) -> str:
    return json.dumps({
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"AWS": ["*"]},
            "Action": ["s3:GetObject"],
            "Resource": [f"arn:aws:s3:::{bucket}/*"],
        }],
    })


class EvidenceStore:
    def __init__(self) -> None:
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=settings.minio_secure,
        )
        self._bucket = settings.minio_bucket
        self._public = settings.minio_public_url.rstrip("/")

    def ensure_bucket(self) -> None:
        if not self._client.bucket_exists(self._bucket):
            self._client.make_bucket(self._bucket)
            logger.info("Created MinIO bucket '%s'", self._bucket)
        try:
            self._client.set_bucket_policy(self._bucket, _public_read_policy(self._bucket))
        except Exception:
            logger.warning("Could not set public read policy on bucket '%s'", self._bucket,
                           exc_info=True)

    def upload(self, local_path: str, object_name: str) -> str:
        """Upload a file and return its stable public URL."""
        self._client.fput_object(
            self._bucket, object_name, local_path, content_type="video/mp4"
        )
        return f"{self._public}/{self._bucket}/{object_name}"
