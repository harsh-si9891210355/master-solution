# Custom MediaMTX image.
#
# We base on Ubuntu (glibc) rather than the upstream scratch image for two reasons:
#   1. We need a shell + GNU date + gawk for the weekly, level-split log files
#      (debug_/logger_<week-start>_to_<week-end>.log) produced by entrypoint.sh.
#   2. We bundle FFmpeg so MediaMTX's runOnReady can transcode recordings to a
#      reduced quality. Ubuntu's ffmpeg ships BOTH libx264 (CPU) and h264_nvenc
#      (NVIDIA GPU); NVENC stays dormant unless a GPU + NVIDIA Container Toolkit
#      are present, so the same image runs in CPU mode here and GPU mode in prod.
# MediaMTX itself is a static Go binary, so we just copy it in from the official
# image.
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg gawk coreutils ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ffmpeg -hide_banner -encoders | grep -E 'libx264|nvenc'

COPY --from=bluenviron/mediamtx:latest /mediamtx /usr/bin/mediamtx
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
