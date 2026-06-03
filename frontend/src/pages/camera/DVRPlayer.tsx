import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import type { DVRPlayerProps } from './types/index';

type PlayerStatus = 'idle' | 'connecting' | 'playing' | 'error';

// Within this many seconds of the live edge the player is considered "live".
// Set just above LIVE_MAX_LATENCY so normal buffering never flips the badge.
const LIVE_EDGE_THRESHOLD_S = 25;
const LIVE_MAX_LATENCY      = 20;   // seconds

export const DVRPlayer = ({
    hlsUrl,
    rtspUrl,
    events = [],
    dvrWindowMin    = 120,
    segmentDurationS = 4,
}: DVRPlayerProps) => {
    const LIVE_SYNC_DURATION = segmentDurationS * 2;   // 8 s with default 4 s segments

    const videoRef      = useRef<HTMLVideoElement>(null);
    const hlsRef        = useRef<Hls | null>(null);
    const seekTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef        = useRef<number | null>(null);
    const isSeekingRef  = useRef(false);
    const timelineRef   = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    // Tracks whether we have disabled the hls.js LatencyController snap-back.
    const isDVRModeRef  = useRef(false);

    const [status, setStatus]                         = useState<PlayerStatus>('idle');
    const [errorMsg, setErrorMsg]                     = useState<string | null>(null);
    const [sliderValue, setSliderValue]               = useState(dvrWindowMin);
    const [timeLabel, setTimeLabel]                   = useState('LIVE');
    const [isAtLiveEdge, setIsAtLiveEdge]             = useState(true);
    const [availableWindowMin, setAvailableWindowMin] = useState(dvrWindowMin);

    // Start/restart when the URL becomes available.
    useEffect(() => {
        if (hlsUrl) startPlayer(hlsUrl);
        else { teardown(); setStatus('connecting'); }
        return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hlsUrl]);

    // ── rAF position tracker ──────────────────────────────────────────────────

    const startPositionTracking = () => {
        const tick = () => {
            const v = videoRef.current;
            if (v && !isSeekingRef.current && v.seekable.length > 0) {
                const end   = v.seekable.end(0);
                const start = v.seekable.start(0);
                setAvailableWindowMin(Math.max(1, Math.round((end - start) / 60)));
                const lagSec = end - v.currentTime;
                const lagMin = lagSec / 60;
                setSliderValue(Math.max(0, dvrWindowMin - lagMin));
                if (lagSec < LIVE_EDGE_THRESHOLD_S) {
                    setIsAtLiveEdge(true);
                    setTimeLabel('LIVE');
                } else {
                    setIsAtLiveEdge(false);
                    const wallTime = new Date(Date.now() - lagSec * 1000);
                    setTimeLabel(
                        wallTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        + ', ' + wallTime.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    );
                }
            }
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    };

    const stopPositionTracking = () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    };

    // ── DVR mode: suppress / restore hls.js LatencyController ────────────────
    //
    // The LatencyController reads liveMaxLatencyDuration from hls.config on
    // every timeupdate. If currentTime < liveEdge - liveMaxLatencyDuration it
    // jumps the playhead back to the live edge — the "snap-back" bug.
    // Setting both values to Infinity disables that jump while in DVR mode.

    const enterDVRMode = () => {
        const hls = hlsRef.current;
        if (!hls || isDVRModeRef.current) return;
        isDVRModeRef.current              = true;
        hls.config.liveMaxLatencyDuration = Infinity;
        hls.config.liveSyncDuration       = Infinity;
    };

    const exitDVRMode = () => {
        const hls = hlsRef.current;
        if (!hls || !isDVRModeRef.current) return;
        isDVRModeRef.current              = false;
        hls.config.liveMaxLatencyDuration = LIVE_MAX_LATENCY;
        hls.config.liveSyncDuration       = LIVE_SYNC_DURATION;
    };

    // ── Cleanup ───────────────────────────────────────────────────────────────

    const stopHls = () => {
        stopPositionTracking();
        hlsRef.current?.destroy();
        hlsRef.current       = null;
        isDVRModeRef.current = false;
        const v = videoRef.current;
        if (v) { v.pause(); v.removeAttribute('src'); }
    };

    const teardown = () => {
        if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
        stopHls();
        setStatus('idle');
        setErrorMsg(null);
        setSliderValue(dvrWindowMin);
        setTimeLabel('LIVE');
        setIsAtLiveEdge(true);
        isSeekingRef.current = false;
    };

    // ── Player init ───────────────────────────────────────────────────────────

    const startPlayer = (url: string) => {
        stopHls();
        const v = videoRef.current;
        if (!v) return;
        setStatus('connecting');
        setErrorMsg(null);
        setSliderValue(dvrWindowMin);
        setTimeLabel('LIVE');
        setIsAtLiveEdge(true);

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: false,   // standard HLS segments (not LL-HLS)
                startPosition: -1,       // start at live edge

                // Latency: target 2 segments (8 s) behind live; allow up to 20 s
                // before hls.js catches up. Absolute-second config is more
                // predictable than segment-count equivalents.
                liveSyncDuration: LIVE_SYNC_DURATION,
                liveMaxLatencyDuration: LIVE_MAX_LATENCY,

                // Expose the full rolling DVR window as the seekable range.
                // Without this flag hls.js caps seekable to a short window and
                // backward seeks beyond it silently fail.
                liveDurationInfinity: true,

                // Prefetch the next fragment while the current one plays.
                startFragPrefetch: true,

                // Keep 2 min of played segments in memory for fast backward seek.
                backBufferLength: 120,

                maxBufferLength: 20,
                maxMaxBufferLength: 30,

                maxBufferHole: 0.5,
                highBufferWatchdogPeriod: 3,
                nudgeMaxRetry: 5,
                nudgeOffset: 0.1,

                manifestLoadingMaxRetry: 6,
                manifestLoadingRetryDelay: 500,
                fragLoadingMaxRetry: 6,
            });
            hlsRef.current = hls;
            hls.loadSource(url);
            hls.attachMedia(v);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                v.play().catch(() => {});
                setStatus('playing');
                startPositionTracking();
            });

            hls.on(Hls.Events.ERROR, (_: string, data: { fatal: boolean; type: string }) => {
                if (data.fatal) {
                    setStatus('error');
                    setErrorMsg(
                        data.type === Hls.ErrorTypes.NETWORK_ERROR
                            ? 'Stream not ready — camera may be offline or DVR files not yet written'
                            : 'Stream error'
                    );
                }
            });
        } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native HLS — DVR seek works via video.currentTime
            v.src = url;
            v.addEventListener('loadedmetadata', () => {
                v.play().catch(() => {});
                setStatus('playing');
                startPositionTracking();
            }, { once: true });
        } else {
            setStatus('error');
            setErrorMsg('HLS is not supported in this browser');
        }
    };

    // ── Timeline controls ─────────────────────────────────────────────────────

    const goLive = () => {
        // Restore LatencyController BEFORE seeking so hls.js resumes managing
        // the live edge naturally once we land there.
        exitDVRMode();
        const v = videoRef.current;
        if (!v || v.seekable.length === 0) return;
        v.currentTime = v.seekable.end(0);
        v.play().catch(() => {});
    };

    const handleSliderChange = (val: number) => {
        setSliderValue(val);
        isSeekingRef.current = true;
        if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
        seekTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            if (v && v.seekable.length > 0) {
                const end    = v.seekable.end(0);
                const lagSec = (dvrWindowMin - val) * 60;
                const target = Math.max(v.seekable.start(0), end - lagSec);
                // Disable snap-back BEFORE setting currentTime so the
                // LatencyController doesn't override the seek on the next timeupdate.
                if (lagSec > LIVE_EDGE_THRESHOLD_S) enterDVRMode();
                else exitDVRMode();
                v.currentTime = target;
                // hls.js loads segments async; play() ensures video resumes
                // after the buffer fills rather than staying stalled.
                v.play().catch(() => {});
            }
            isSeekingRef.current = false;
        }, 150);
    };

    const nudge = (deltaMin: number) =>
        handleSliderChange(Math.max(0, Math.min(dvrWindowMin, sliderValue + deltaMin)));

    // ── Custom timeline drag (pointer capture) ────────────────────────────────

    const clientXToValue = (clientX: number): number => {
        const el = timelineRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(dvrWindowMin,
            ((clientX - rect.left) / rect.width) * dvrWindowMin
        ));
    };

    const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (status !== 'playing') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        isDraggingRef.current = true;
        isSeekingRef.current  = true;
        setSliderValue(clientXToValue(e.clientX));
    };

    const handleTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        setSliderValue(clientXToValue(e.clientX));
    };

    const handleTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        handleSliderChange(clientXToValue(e.clientX));
    };

    // ── Event marker helpers ──────────────────────────────────────────────────

    const eventToPercent = (ev: CameraEvent): number => {
        const minutesAgo = (Date.now() - ev.timestamp.getTime()) / 60000;
        return ((dvrWindowMin - minutesAgo) / dvrWindowMin) * 100;
    };

    const seekToEvent = (ev: CameraEvent) => {
        const minutesAgo = (Date.now() - ev.timestamp.getTime()) / 60000;
        handleSliderChange(Math.max(0, Math.min(dvrWindowMin, dvrWindowMin - minutesAgo)));
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const fillPct    = `${(sliderValue / dvrWindowMin) * 100}%`;
    const visibleEvs = events.filter(ev => { const p = eventToPercent(ev); return p >= 0 && p <= 100; });

    const statusDotColor =
        status === 'connecting' ? 'bg-yellow-400 animate-pulse' :
        status === 'error'      ? 'bg-red-500' :
        status === 'playing'    ? (isAtLiveEdge ? 'bg-green-500' : 'bg-purple-400') :
        'bg-gray-400';

    const statusLabel =
        status === 'playing'    ? (isAtLiveEdge ? 'LIVE' : `DVR · ${timeLabel}`) :
        status === 'connecting' ? 'CONNECTING' :
        status === 'error'      ? 'ERROR' : 'IDLE';

    return (
        <div
            className="relative bg-black rounded-xl overflow-hidden select-none"
            style={{ aspectRatio: '16/9' }}
        >
            {/* Connecting overlay */}
            {(status === 'connecting' || status === 'idle') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white">
                    <i className="pi pi-spin pi-spinner text-3xl text-purple-400" />
                    <span className="text-sm text-gray-300">Connecting…</span>
                </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                    <i className="pi pi-exclamation-triangle text-3xl text-red-400" />
                    <span className="text-sm text-red-300 text-center px-6">{errorMsg}</span>
                    {hlsUrl && (
                        <button
                            onClick={() => startPlayer(hlsUrl)}
                            className="mt-1 px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                        >
                            Retry
                        </button>
                    )}
                </div>
            )}

            {/* Video — always mounted so hls.js can attach */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
                style={{ display: status === 'playing' ? 'block' : 'none' }}
            />

            {/* Status badge (top-left) */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5
                            bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor}`} />
                <span className="text-[11px] font-semibold text-white/90 leading-none tracking-wide">
                    {statusLabel}
                </span>
            </div>

            {/* DVR controls overlay (bottom gradient panel) */}
            {status === 'playing' && (
                <div className="absolute bottom-0 left-0 right-0 z-20
                                bg-gradient-to-t from-black/90 via-black/50 to-transparent
                                px-4 pt-14 pb-3 flex flex-col gap-2">

                    {/* Time range labels */}
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/50 mb-0.5 px-0.5">
                        <span>← {availableWindowMin} min ago</span>
                        <span>NOW →</span>
                    </div>

                    {/* Event badges + scrub track */}
                    <div className="relative" style={{ paddingTop: '28px' }}>

                        {/* Event badges above the track */}
                        {visibleEvs.map(ev => {
                            const pct = eventToPercent(ev);
                            return (
                                <div
                                    key={ev.id}
                                    className="absolute top-0 flex flex-col items-center group z-10"
                                    style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                                >
                                    <button
                                        className={`w-5 h-5 rounded-full flex items-center justify-center
                                                    text-white shadow-md ${ev.color}
                                                    hover:scale-125 active:scale-110 transition-transform
                                                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                        onClick={() => seekToEvent(ev)}
                                        disabled={status !== 'playing'}
                                        onPointerDown={e => e.stopPropagation()}
                                    >
                                        <i className={`pi ${ev.icon}`} style={{ fontSize: '8px' }} />

                                        {/* Tooltip */}
                                        <div className="absolute bottom-7 left-1/2 -translate-x-1/2 z-30
                                                        bg-gray-900 text-white rounded-lg px-2.5 py-1.5
                                                        whitespace-nowrap text-left shadow-xl
                                                        opacity-0 group-hover:opacity-100 pointer-events-none
                                                        transition-opacity duration-150">
                                            <div className="text-xs font-semibold">{ev.label}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                {ev.timestamp.toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                })}
                                            </div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2
                                                            border-4 border-transparent border-t-gray-900" />
                                        </div>
                                    </button>
                                    <div className={`w-px h-1.5 ${ev.color} opacity-60`} />
                                </div>
                            );
                        })}

                        {/* Draggable scrub track */}
                        <div
                            ref={timelineRef}
                            className="relative h-1.5 rounded-full select-none overflow-visible cursor-pointer"
                            style={{ background: 'rgba(255,255,255,0.18)' }}
                            onPointerDown={handleTrackPointerDown}
                            onPointerMove={handleTrackPointerMove}
                            onPointerUp={handleTrackPointerUp}
                        >
                            {/* Played portion */}
                            <div
                                className="absolute inset-y-0 left-0 bg-purple-400 rounded-full pointer-events-none"
                                style={{ width: fillPct }}
                            />

                            {/* Event tick marks on the track */}
                            {visibleEvs.map(ev => (
                                <div
                                    key={ev.id}
                                    className={`absolute top-0 bottom-0 w-0.5 -translate-x-1/2 ${ev.color} opacity-80 pointer-events-none`}
                                    style={{ left: `${eventToPercent(ev)}%` }}
                                />
                            ))}

                            {/* Scrub thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                                           w-3.5 h-3.5 bg-white border-2 border-purple-400 rounded-full
                                           shadow-lg pointer-events-none z-10"
                                style={{ left: fillPct }}
                            />
                        </div>
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center gap-1.5 mt-1">
                        <button
                            onClick={() => nudge(-10 / 60)}
                            disabled={status !== 'playing'}
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25
                                       text-white rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ← 10s
                        </button>
                        <button
                            onClick={() => nudge(-30)}
                            disabled={status !== 'playing' || sliderValue <= 0}
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25
                                       text-white rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ← 30 min
                        </button>
                        <button
                            onClick={() => nudge(30)}
                            disabled={status !== 'playing' || sliderValue >= dvrWindowMin}
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25
                                       text-white rounded-md transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            30 min →
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                            {rtspUrl && (
                                <span className="hidden sm:inline font-mono text-[10px] text-white/25 truncate max-w-[180px]">
                                    {rtspUrl}
                                </span>
                            )}
                            {!isAtLiveEdge && (
                                <button
                                    onClick={goLive}
                                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold
                                               bg-green-500 hover:bg-green-400 text-white rounded-md transition"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                                    LIVE
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
