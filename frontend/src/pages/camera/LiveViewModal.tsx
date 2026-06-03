import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import Hls from 'hls.js';
import type { Camera } from './types/index';
import type { StreamInfo } from './api/cameraService';
import { cameraService } from './api/cameraService';

export interface CameraEvent {
    id: string | number;
    timestamp: Date;
    type: string;
    label: string;
    icon: string;   // PrimeIcons class, e.g. 'pi-eye'
    color: string;  // Tailwind bg-* class, e.g. 'bg-purple-500'
}

interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
    events?: CameraEvent[];
}

type StreamStatus = 'idle' | 'connecting' | 'playing' | 'error';

// Must match DVR_HOURS in dvr-worker (default 2 h = 120 min).
const DVR_WINDOW_MIN = 120;
// Within this many seconds of the live edge the player is considered "live".
const LIVE_EDGE_THRESHOLD_S = 30;

// Demo event markers — replace by passing real events via the `events` prop from your backend.
const DEMO_EVENTS: CameraEvent[] = [
    { id: 1, timestamp: new Date(Date.now() - 100 * 60 * 1000), type: 'motion', label: 'Motion detected',  icon: 'pi-eye',                  color: 'bg-purple-500' },
    { id: 2, timestamp: new Date(Date.now() -  75 * 60 * 1000), type: 'person', label: 'Person detected',  icon: 'pi-user',                 color: 'bg-blue-500'   },
    { id: 3, timestamp: new Date(Date.now() -  50 * 60 * 1000), type: 'alert',  label: 'Alert triggered',  icon: 'pi-exclamation-triangle', color: 'bg-red-500'    },
    { id: 4, timestamp: new Date(Date.now() -  20 * 60 * 1000), type: 'person', label: 'Person detected',  icon: 'pi-user',                 color: 'bg-blue-500'   },
    { id: 5, timestamp: new Date(Date.now() -   8 * 60 * 1000), type: 'motion', label: 'Motion detected',  icon: 'pi-eye',                  color: 'bg-purple-500' },
];

export const LiveViewModal = ({ camera, visible, onHide, events = DEMO_EVENTS }: LiveViewModalProps) => {
    const videoRef      = useRef<HTMLVideoElement>(null);
    const hlsRef        = useRef<Hls | null>(null);
    const streamInfoRef = useRef<StreamInfo | null>(null);
    const seekTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef        = useRef<number | null>(null);
    // Blocks the rAF position tracker from overwriting slider while user drags.
    const isSeekingRef  = useRef(false);
    const timelineRef   = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);

    const [status, setStatus]                         = useState<StreamStatus>('idle');
    const [errorMsg, setErrorMsg]                     = useState<string | null>(null);
    const [sliderValue, setSliderValue]               = useState(DVR_WINDOW_MIN);
    const [timeLabel, setTimeLabel]                   = useState('LIVE');
    const [isAtLiveEdge, setIsAtLiveEdge]             = useState(true);
    // Actual available DVR window (seconds), updated once seekable range is known.
    const [availableWindowMin, setAvailableWindowMin] = useState(DVR_WINDOW_MIN);

    useEffect(() => {
        if (visible && camera) initPlayer();
        return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, camera?.id]);

    // ── rAF position tracker ──────────────────────────────────────────────────

    const startPositionTracking = () => {
        const tick = () => {
            const v = videoRef.current;
            if (v && !isSeekingRef.current && v.seekable.length > 0) {
                const end   = v.seekable.end(0);
                const start = v.seekable.start(0);

                // Keep displayed window label in sync with actual available range.
                setAvailableWindowMin(Math.max(1, Math.round((end - start) / 60)));

                // How far behind live are we?
                const lagSec = end - v.currentTime;
                const lagMin = lagSec / 60;

                // Slider: 0 = oldest, DVR_WINDOW_MIN = live edge.
                setSliderValue(Math.max(0, DVR_WINDOW_MIN - lagMin));

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

    // ── Cleanup ───────────────────────────────────────────────────────────────

    const stopHls = () => {
        stopPositionTracking();
        hlsRef.current?.destroy();
        hlsRef.current = null;
        const v = videoRef.current;
        if (v) { v.pause(); v.removeAttribute('src'); }
    };

    const teardown = () => {
        if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
        stopHls();
        setStatus('idle');
        setErrorMsg(null);
        isSeekingRef.current = false;
    };

    // ── Initialise player ─────────────────────────────────────────────────────

    const initPlayer = async () => {
        if (!camera) return;
        setSliderValue(DVR_WINDOW_MIN);
        setTimeLabel('LIVE');
        setIsAtLiveEdge(true);
        setStatus('connecting');
        try {
            const { data } = await cameraService.getStreamInfo(camera.id);
            streamInfoRef.current = data;
            startUnifiedPlayer(data);
        } catch {
            setStatus('error');
            setErrorMsg('Failed to fetch stream info');
        }
    };

    // ── Unified DVR player ────────────────────────────────────────────────────
    // One hls.js instance handles the full rolling DVR playlist.
    // Live edge, rewind, and jump-to-live all operate on the same manifest URL.
    // No URL switches or player recreation on seek.

    const startUnifiedPlayer = (si: StreamInfo) => {
        stopHls();
        const v = videoRef.current;
        if (!v) return;
        setStatus('connecting');
        setErrorMsg(null);

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: false,
                startPosition: -1,
                // Back-buffer: keep 60 s so DVR rewind doesn't re-fetch segments.
                backBufferLength: 60,
                // Forward buffer: 12 s is plenty for live; avoids holding excess
                // memory for a stream that will never pause for long.
                maxBufferLength: 12,
                maxMaxBufferLength: 20,
                // 3 segments behind live: with 2 s segments = 6 s latency.
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 7,
                // Tolerate up to 0.5 s gap without stalling (handles the tiny
                // discontinuity at a segment boundary after a camera reconnect).
                maxBufferHole: 0.5,
                // Check for a frozen playhead every 3 s and nudge it forward.
                highBufferWatchdogPeriod: 3,
                nudgeMaxRetry: 5,
            });
            hlsRef.current = hls;
            hls.loadSource(si.hls_url);
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
            v.src = si.hls_url;
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
        const v = videoRef.current;
        if (!v || v.seekable.length === 0) return;
        // Jump to live edge; rAF tracker will update slider and label.
        v.currentTime = v.seekable.end(0);
    };

    const handleSliderChange = (val: number) => {
        setSliderValue(val);
        isSeekingRef.current = true;

        if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
        seekTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            if (v && v.seekable.length > 0) {
                const end = v.seekable.end(0);
                // How many seconds behind live does the slider position represent?
                const lagSec  = (DVR_WINDOW_MIN - val) * 60;
                const target  = Math.max(v.seekable.start(0), end - lagSec);
                v.currentTime = target;
            }
            isSeekingRef.current = false;
        }, 300);
    };

    // deltaMin: negative = rewind, positive = forward
    const nudge = (deltaMin: number) =>
        handleSliderChange(Math.max(0, Math.min(DVR_WINDOW_MIN, sliderValue + deltaMin)));

    // ── Custom timeline drag (pointer capture) ────────────────────────────────

    const clientXToValue = (clientX: number): number => {
        const el = timelineRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        return Math.max(0, Math.min(DVR_WINDOW_MIN,
            ((clientX - rect.left) / rect.width) * DVR_WINDOW_MIN
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

    // Convert a wall-clock event timestamp to a 0–100% position on the timeline bar.
    // 0% = oldest (DVR_WINDOW_MIN minutes ago), 100% = live edge (now).
    const eventToPercent = (ev: CameraEvent): number => {
        const minutesAgo = (Date.now() - ev.timestamp.getTime()) / 60000;
        return ((DVR_WINDOW_MIN - minutesAgo) / DVR_WINDOW_MIN) * 100;
    };

    const seekToEvent = (ev: CameraEvent) => {
        const minutesAgo = (Date.now() - ev.timestamp.getTime()) / 60000;
        const sliderVal  = Math.max(0, Math.min(DVR_WINDOW_MIN, DVR_WINDOW_MIN - minutesAgo));
        handleSliderChange(sliderVal);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    const statusDot: Record<StreamStatus, string> = {
        idle:       'bg-gray-400',
        connecting: 'bg-yellow-400 animate-pulse',
        playing:    isAtLiveEdge ? 'bg-green-500' : 'bg-purple-500',
        error:      'bg-red-500',
    };

    const fillPct    = `${(sliderValue / DVR_WINDOW_MIN) * 100}%`;
    const visibleEvs = events.filter(ev => { const p = eventToPercent(ev); return p >= 0 && p <= 100; });

    return (
        <Dialog
            visible={visible}
            onHide={() => { teardown(); onHide(); }}
            header={
                <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <i className="pi pi-video text-xs" />
                    </div>
                    <span className="font-semibold text-gray-800 truncate max-w-xs">
                        {camera?.name_en ?? 'Live View'}
                    </span>
                </div>
            }
            style={{ width: 'min(95vw, 72rem)' }}
            modal
            closable
            className="live-view-dialog"
        >
            <div className="flex flex-col gap-4">

                {/* ── Video ─────────────────────────────────────────────── */}
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    {status === 'connecting' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                            <i className="pi pi-spin pi-spinner text-3xl text-purple-400" />
                            <span className="text-sm text-gray-300">Connecting…</span>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <i className="pi pi-exclamation-triangle text-3xl text-red-400" />
                            <span className="text-sm text-red-300 text-center px-6">{errorMsg}</span>
                            <button
                                onClick={() => {
                                    const si = streamInfoRef.current;
                                    if (si) startUnifiedPlayer(si);
                                }}
                                className="mt-1 px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                        style={{ display: status === 'playing' ? 'block' : 'none' }}
                    />
                </div>

                {/* ── Status bar ────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-1 text-sm text-gray-500">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[status]}`} />
                    <span className="font-medium">
                        {status === 'connecting' && 'Connecting…'}
                        {status === 'playing'    && (isAtLiveEdge ? 'Live' : `DVR · ${timeLabel}`)}
                        {status === 'error'      && 'Error'}
                        {status === 'idle'       && 'Idle'}
                    </span>
                    {camera?.rtsp_url && (
                        <span className="font-mono text-xs text-gray-400 ml-auto truncate max-w-sm">
                            {camera.rtsp_url}
                        </span>
                    )}
                </div>

                {/* ── DVR Timeline ──────────────────────────────────────── */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                        <span>← {availableWindowMin} min ago</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isAtLiveEdge
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                        }`}>
                            {timeLabel}
                        </span>
                        <span>NOW →</span>
                    </div>

                    {/* Event icon row + draggable scrub bar */}
                    <div className="relative" style={{ paddingTop: '36px' }}>

                        {/* Event markers: icon badge above the track, tick mark on the track */}
                        {visibleEvs.map(ev => {
                            const pct = eventToPercent(ev);
                            return (
                                <div
                                    key={ev.id}
                                    className="absolute top-0 flex flex-col items-center group z-10"
                                    style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                                >
                                    {/* Clickable event badge */}
                                    <button
                                        className={`relative w-6 h-6 rounded-full flex items-center justify-center
                                                    text-white shadow-md ${ev.color}
                                                    hover:scale-125 active:scale-110 transition-transform
                                                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                        onClick={() => seekToEvent(ev)}
                                        disabled={status !== 'playing'}
                                        onPointerDown={e => e.stopPropagation()}
                                    >
                                        <i className={`pi ${ev.icon}`} style={{ fontSize: '9px' }} />

                                        {/* Tooltip — shown on group hover, appears above the badge */}
                                        <div
                                            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30
                                                        bg-gray-900 text-white rounded-lg px-2.5 py-2
                                                        whitespace-nowrap text-left shadow-xl
                                                        opacity-0 group-hover:opacity-100 pointer-events-none
                                                        transition-opacity duration-150"
                                        >
                                            <div className="text-xs font-semibold">{ev.label}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                {ev.timestamp.toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                                                })}
                                            </div>
                                            {/* Downward caret */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2
                                                            border-4 border-transparent border-t-gray-900" />
                                        </div>
                                    </button>

                                    {/* Thin connector from badge down to the track */}
                                    <div className={`w-px h-2 ${ev.color} opacity-60`} />
                                </div>
                            );
                        })}

                        {/* Draggable scrub track */}
                        <div
                            ref={timelineRef}
                            className={`relative h-3 rounded-full select-none overflow-visible
                                        ${status === 'playing' ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            style={{ background: '#e5e7eb' }}
                            onPointerDown={handleTrackPointerDown}
                            onPointerMove={handleTrackPointerMove}
                            onPointerUp={handleTrackPointerUp}
                        >
                            {/* Played-portion fill */}
                            <div
                                className="absolute inset-y-0 left-0 bg-purple-500 rounded-full pointer-events-none"
                                style={{ width: fillPct }}
                            />

                            {/* Coloured tick marks on the track at each event position */}
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
                                           w-4 h-4 bg-white border-2 border-purple-600 rounded-full
                                           shadow pointer-events-none z-10"
                                style={{ left: fillPct }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                            onClick={() => nudge(-10 / 60)}
                            disabled={status !== 'playing'}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            ← 10s
                        </button>
                        <button
                            onClick={() => nudge(-30)}
                            disabled={status !== 'playing' || sliderValue <= 0}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            ← 30 min
                        </button>
                        <button
                            onClick={() => nudge(30)}
                            disabled={status !== 'playing' || sliderValue >= DVR_WINDOW_MIN}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            30 min →
                        </button>
                        {!isAtLiveEdge && (
                            <button
                                onClick={goLive}
                                className="px-4 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold"
                            >
                                ● LIVE
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </Dialog>
    );
};
