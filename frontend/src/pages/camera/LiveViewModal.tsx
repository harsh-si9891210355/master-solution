import { useEffect, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import Hls from 'hls.js';
import type { Camera } from './types/index';
import type { StreamInfo } from './api/cameraService';
import { cameraService } from './api/cameraService';

interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
}

type StreamStatus = 'idle' | 'connecting' | 'playing' | 'error';

// Must match DVR_HOURS in dvr-worker (default 2 h = 120 min).
const DVR_WINDOW_MIN = 120;
// Within this many seconds of the live edge the player is considered "live".
const LIVE_EDGE_THRESHOLD_S = 30;

export const LiveViewModal = ({ camera, visible, onHide }: LiveViewModalProps) => {
    const videoRef      = useRef<HTMLVideoElement>(null);
    const hlsRef        = useRef<Hls | null>(null);
    const streamInfoRef = useRef<StreamInfo | null>(null);
    const seekTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef        = useRef<number | null>(null);
    // Blocks the rAF position tracker from overwriting slider while user drags.
    const isSeekingRef  = useRef(false);

    const [status, setStatus]           = useState<StreamStatus>('idle');
    const [errorMsg, setErrorMsg]       = useState<string | null>(null);
    const [sliderValue, setSliderValue] = useState(DVR_WINDOW_MIN);
    const [timeLabel, setTimeLabel]     = useState('LIVE');
    const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
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
                const end = v.seekable.end(0);
                const start = v.seekable.start(0);
                const windowSec = end - start;

                // Keep displayed window label in sync with actual available range.
                setAvailableWindowMin(Math.max(1, Math.round(windowSec / 60)));

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
                // Standard (not LL) HLS — our segments are 4 s fMP4, not EXT-X-PART.
                lowLatencyMode: false,
                // Start at the live edge.
                startPosition: -1,
                // Keep up to 60 s of back-buffer for fast backwards seeking.
                backBufferLength: 60,
                maxBufferLength: 30,
                liveSyncDurationCount: 3,
                liveMaxLatencyDurationCount: 10,
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

    // ── Render ────────────────────────────────────────────────────────────────

    const statusDot: Record<StreamStatus, string> = {
        idle:       'bg-gray-400',
        connecting: 'bg-yellow-400 animate-pulse',
        playing:    isAtLiveEdge ? 'bg-green-500' : 'bg-purple-500',
        error:      'bg-red-500',
    };

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

                    {/* Left = oldest available, right = live edge */}
                    <input
                        type="range"
                        min={0}
                        max={DVR_WINDOW_MIN}
                        step={0.1}
                        value={Math.round(sliderValue * 10) / 10}
                        onChange={e => handleSliderChange(Number(e.target.value))}
                        disabled={status !== 'playing'}
                        className="w-full accent-purple-600 cursor-pointer disabled:cursor-not-allowed"
                        title="Drag left to rewind, right for live"
                    />

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
