# Custom MediaMTX image.
#
# The upstream bluenviron/mediamtx image is built FROM scratch (no shell), and
# MediaMTX itself can only write to a single static logFile path. To get a
# weekly-named log files (debug_/logger_<week-start>_to_<week-end>.log) matching
# the backend, we copy the statically-linked binary onto Alpine and wrap it with
# an entrypoint that computes the week range and splits the log stream by level.
FROM alpine:3.20

# coreutils -> GNU `date` for relative date arithmetic; gawk -> log splitting
# with reliable per-file flushing (busybox awk lacks fflush()).
RUN apk add --no-cache coreutils gawk

COPY --from=bluenviron/mediamtx:latest /mediamtx /usr/bin/mediamtx
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
