#!/bin/sh
set -e

LOG_DIR=/logs/mediamtx
mkdir -p "$LOG_DIR"

# Current week's Monday..Sunday range, matching the backend's file naming.
dow=$(date +%u)                          # 1 (Mon) .. 7 (Sun)
start=$(date -d "-$((dow - 1)) days" +%F)
end=$(date -d "$start +6 days" +%F)

debug_file="$LOG_DIR/debug_${start}_to_${end}.log"
info_file="$LOG_DIR/logger_${start}_to_${end}.log"

# Retain ~4 weeks of logs, matching the backend's backupCount.
find "$LOG_DIR" \( -name 'debug_*.log' -o -name 'logger_*.log' \) \
    -type f -mtime +28 -delete 2>/dev/null || true

# MediaMTX supports only one logLevel and one logFile, so we make it emit all
# levels to stdout and split the stream by level here, mirroring the backend:
#   debug_*.log  <- DEB / ERR
#   logger_*.log <- INF / WAR
export MTX_LOGLEVEL=debug
export MTX_LOGDESTINATIONS=stdout

fifo=$(mktemp -u)
mkfifo "$fifo"

# Splitter: echo every line to container stdout (docker logs) and route by level.
gawk -v dbg="$debug_file" -v inf="$info_file" '
{
    print
    if ($0 ~ / (DEB|ERR) /)      { print >> dbg; fflush(dbg) }
    else if ($0 ~ / (INF|WAR) /) { print >> inf; fflush(inf) }
}' < "$fifo" &
splitter_pid=$!

# Forward shutdown signals to MediaMTX for a graceful stop.
trap 'kill -TERM "$mtx_pid" 2>/dev/null' TERM INT

/usr/bin/mediamtx /mediamtx.yml > "$fifo" 2>&1 &
mtx_pid=$!

wait "$mtx_pid"
wait "$splitter_pid" 2>/dev/null || true
rm -f "$fifo"
