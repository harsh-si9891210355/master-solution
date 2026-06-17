FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
# Expose both the app and Debian's dist-packages so the apt-installed GStreamer
# Python bindings (python3-gi, built for the same 3.11 ABI) are importable from
# the python:3.11-slim interpreter. If gi still cannot load, the service falls
# back to the OpenCV decoder automatically.
ENV PYTHONPATH=/app:/usr/lib/python3/dist-packages

# System deps:
#   - GStreamer runtime + plugins + python3-gi  -> GStreamer decoder backend
#   - libGL/libglib                             -> OpenCV runtime
# pika (RabbitMQ client) is pure Python, so no apt package is needed.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        libglib2.0-0 libgl1 \
        python3-gi gir1.2-gst-plugins-base-1.0 \
        gstreamer1.0-tools \
        gstreamer1.0-plugins-base \
        gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad \
        gstreamer1.0-libav \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Prometheus metrics endpoint.
EXPOSE 9105

CMD ["python", "main.py"]
