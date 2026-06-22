FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PIP_NO_CACHE_DIR=1
# Cache the auto-downloaded YOLO weights on a writable path (mount a volume here
# to persist them across container recreation and avoid re-downloading).
ENV YOLO_CONFIG_DIR=/app/.ultralytics

# OpenCV runtime libs (libGL/libglib) for cv2; ca-certificates for weight download.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates libglib2.0-0 libgl1 \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install the CPU build of torch first so ultralytics doesn't pull CUDA wheels.
RUN pip install --upgrade pip && \
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install -r requirements.txt

COPY . .

# Prometheus metrics endpoint.
EXPOSE 9106

CMD ["python", "main.py"]
