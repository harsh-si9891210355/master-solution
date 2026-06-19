FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PIP_NO_CACHE_DIR=1

# ffmpeg for the H.264 re-encode; libGL/libglib for OpenCV; ca-certs for MinIO TLS.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates ffmpeg libglib2.0-0 libgl1 \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

EXPOSE 9107

CMD ["python", "main.py"]
