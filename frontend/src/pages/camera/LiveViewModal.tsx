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

type PlayerMode = 'live' | 'dvr';
type StreamStatus = 'idle' | 'connecting' | 'playing' | 'error';

const DVR_WINDOW_MIN = 720; // 12 hours

export const LiveViewModal = ({ camera, visible, onHide }: LiveViewModalProps) => {
    const videoRef      = useRef<HTMLVideoElement>(null);
    const hlsRef        = useRef<Hls | null>(null);
    const seekTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
    const streamInfoRef = useRef<StreamInfo | null>(null);

    const [mode, setMode]               = useState<PlayerMode>('live');
    const [status, setStatus]           = useState<StreamStatus>('idle');
    const [errorMsg, setErrorMsg]       = useState<string | null>(null);
    const [sliderValue, setSliderValue] = useState(DVR_WINDOW_MIN);
    const [timeLabel, setTimeLabel]     = useState('LIVE');

    useEffect(() => {
        if (visible && camera) initPlayer();
        return teardown;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, camera?.id]);

    // ── Cleanup ───────────────────────────────────────────────────────────────

    const stopHls = () => {
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
    };

    // ── Initialise ────────────────────────────────────────────────────────────

    const initPlayer = async () => {
        if (!camera) return;
        setMode('live');
        setSliderValue(DVR_WINDOW_MIN);
        setTimeLabel('LIVE');
        setStatus('connecting');
        try {
            const { data } = await cameraService.getStreamInfo(camera.id);
            streamInfoRef.current = data;
            startHlsLive(data);
        } catch {
            setStatus('error');
            setErrorMsg('Failed to fetch stream info');
        }
    };

    // ── Live — LL-HLS ─────────────────────────────────────────────────────────

    const startHlsLive = (si: StreamInfo) => {
        stopHls();
        const v = videoRef.current;
        if (!v) return;
        setStatus('connecting');
        setErrorMsg(null);

        if (Hls.isSupported()) {
            const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
            hlsRef.current = hls;
            hls.loadSource(si.hls_url);
            hls.attachMedia(v);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                v.play().catch(() => {});
                setStatus('playing');
            });
            hls.on(Hls.Events.ERROR, (_: string, data: { fatal: boolean; type: string }) => {
                if (data.fatal) {
                    setStatus('error');
                    setErrorMsg(
                        data.type === Hls.ErrorTypes.NETWORK_ERROR
                            ? 'Stream not ready — camera may be offline'
                            : 'Stream error'
                    );
                }
            });
        } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
            v.src = si.hls_url;
            v.addEventListener('loadedmetadata', () => {
                v.play().catch(() => {});
                setStatus('playing');
            }, { once: true });
        } else {
            setStatus('error');
            setErrorMsg('HLS is not supported in this browser');
        }
    };

    // ── DVR — fmp4 from MediaMTX playback server ─────────────────────────────
    // MediaMTX GET /get returns a fragmented MP4 stream, not an HLS playlist.
    // hls.js cannot parse it; the native <video> element handles fmp4 directly.

    const startHlsDvr = (si: StreamInfo, offsetMin: number) => {
        stopHls();
        const v = videoRef.current;
        if (!v) return;
        setStatus('connecting');
        setErrorMsg(null);

        const startTime = new Date(Date.now() - offsetMin * 60 * 1000);
        const dvrUrl    = `/dvr-proxy/get?path=${si.stream_path}`
                        + `&start=${startTime.toISOString()}&duration=60m`;

        v.src = dvrUrl;
        v.addEventListener('loadedmetadata', () => {
            v.play().catch(() => {});
            setStatus('playing');
        }, { once: true });
        v.addEventListener('error', () => {
            setStatus('error');
            setErrorMsg('No recording available for this time period');
        }, { once: true });
    };

    // ── Timeline controls ─────────────────────────────────────────────────────

    const goLive = () => {
        const si = streamInfoRef.current;
        if (!si) return;
        setMode('live');
        setTimeLabel('LIVE');
        setSliderValue(DVR_WINDOW_MIN);
        startHlsLive(si);
    };

    const handleSliderChange = (val: number) => {
        setSliderValue(val);
        const offsetMin = DVR_WINDOW_MIN - val;

        if (offsetMin <= 0) {
            setTimeLabel('LIVE');
            setMode('live');
            if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
            goLive();
            return;
        }

        setMode('dvr');
        const t = new Date(Date.now() - offsetMin * 60 * 1000);
        setTimeLabel(
            t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            + ', ' + t.toLocaleDateString([], { month: 'short', day: 'numeric' })
        );

        if (seekTimerRef.current) clearTimeout(seekTimerRef.current);
        seekTimerRef.current = setTimeout(() => {
            const si = streamInfoRef.current;
            if (si) startHlsDvr(si, offsetMin);
        }, 800);
    };

    const nudge = (deltaMin: number) =>
        handleSliderChange(Math.min(DVR_WINDOW_MIN, Math.max(0, sliderValue + deltaMin)));

    // ── Render ────────────────────────────────────────────────────────────────

    const statusDot: Record<StreamStatus, string> = {
        idle:       'bg-gray-400',
        connecting: 'bg-yellow-400 animate-pulse',
        playing:    'bg-green-500',
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
                                    if (!si) return;
                                    if (mode === 'live') startHlsLive(si);
                                    else startHlsDvr(si, DVR_WINDOW_MIN - sliderValue);
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
                        {status === 'playing'    && (mode === 'live' ? 'Live' : `DVR · ${timeLabel}`)}
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
                        <span>← 12 h ago</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            mode === 'live'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                        }`}>
                            {timeLabel}
                        </span>
                        <span>NOW →</span>
                    </div>

                    {/* left = 12 h ago, right = live */}
                    <input
                        type="range"
                        min={0}
                        max={DVR_WINDOW_MIN}
                        step={1}
                        value={Math.round(sliderValue)}
                        onChange={e => handleSliderChange(Number(e.target.value))}
                        className="w-full accent-purple-600 cursor-pointer"
                        title="Drag left to rewind, right for live"
                    />

                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        <button
                            onClick={() => nudge(-10 / 60)}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                        >
                            ← 10s
                        </button>
                        <button
                            onClick={() => nudge(-30)}
                            disabled={sliderValue <= 0}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            ← 30 min
                        </button>
                        <button
                            onClick={() => nudge(30)}
                            disabled={sliderValue >= DVR_WINDOW_MIN}
                            className="px-3 py-1 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            30 min →
                        </button>
                        {mode === 'dvr' && (
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
