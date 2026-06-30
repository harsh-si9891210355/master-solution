import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cameraService, type StreamConfig } from '../../camera/api/cameraService';

// ─────────────────────────────────────────────────────────────────────────────
// NvrPlayer
//
// A self-contained NVR player: live RTSP via MediaMTX WebRTC/WHEP plus DVR
// playback of the recorded stream, with a control bar that matches the Event
// Information design (play/pause, ±10s, ±5min skip, speed, mute, aspect ratio,
// fullscreen, screenshot). Every control drives the real <video> element.
//
// Live is the default. When `initialSeekMs` is set the player opens directly in
// DVR playback at that wall-clock timestamp instead.
// ─────────────────────────────────────────────────────────────────────────────

const EDGE_SAFETY_MS = 5_000;

const DEFAULT_CONFIG: StreamConfig = {
    recording_poll_interval_ms: 2000,
    live_edge_threshold_s: 20,
    playback_format: 'fmp4',
    playback_padding_before_s: 30,
    playback_padding_after_s: 300,
    playback_min_duration_s: 60,
    playback_max_duration_s: 900,
};

type Status = 'idle' | 'connecting' | 'playing' | 'error';
type Mode = 'live' | 'playback';
type ObjectFit = 'cover' | 'contain' | 'fill';

interface NormalizedSpan {
    startMs: number;
    endMs: number;
    playback_get_base_url?: string;
}

interface ActiveClip {
    startMs: number;
    endMs: number;
}

export interface NvrPlayerProps {
    cameraId: number | null;
    cameraName: string;
    liveWebrtcUrl: string | null;
    playbackGetBaseUrl: string | null;
    streamConfig: StreamConfig | null;
    /** Open directly in DVR playback at this wall-clock ms (null = live). */
    initialSeekMs?: number | null;
    /** Reports the current wall-clock position so the timeline marker can follow. */
    onPositionChange?: (wallMs: number | null, isLive: boolean) => void;
    /** Compact control bar (used inside the split evidence view). */
    compact?: boolean;
}

const SPEEDS = [1, 1.5, 2, 4, 8];

const fmtClock = (ms: number) =>
    new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const NvrPlayer = ({
    cameraId,
    cameraName,
    liveWebrtcUrl,
    playbackGetBaseUrl,
    streamConfig,
    initialSeekMs = null,
    onPositionChange,
    compact = false,
}: NvrPlayerProps) => {
    const config = streamConfig ?? DEFAULT_CONFIG;

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const sessionUrlRef = useRef<string | null>(null);
    const activeClipRef = useRef<ActiveClip | null>(null);
    const pendingSeekRef = useRef<number | null>(null);
    const didInitialSeekRef = useRef(false);

    const [spans, setSpans] = useState<NormalizedSpan[]>([]);
    const [mode, setMode] = useState<Mode>(initialSeekMs != null ? 'playback' : 'live');
    const [status, setStatus] = useState<Status>('idle');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [paused, setPaused] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [muted, setMuted] = useState(true);
    const [objectFit, setObjectFit] = useState<ObjectFit>('contain');
    const [displayMs, setDisplayMs] = useState<number | null>(null);
    const [isAtLiveEdge, setIsAtLiveEdge] = useState(initialSeekMs == null);

    // ── Recording spans ───────────────────────────────────────────────────────
    useEffect(() => {
        if (cameraId == null) return;
        let cancelled = false;

        const refresh = async () => {
            try {
                const { data } = await cameraService.getRecordingSpans(cameraId);
                if (cancelled) return;
                setSpans(
                    data.spans
                        .map((s) => ({
                            startMs: new Date(s.start).getTime(),
                            endMs: new Date(s.end).getTime(),
                            playback_get_base_url: s.playback_get_base_url,
                        }))
                        .sort((a, b) => a.startMs - b.startMs),
                );
            } catch {
                /* spans are best-effort; live still works */
            }
        };

        void refresh();
        const t = window.setInterval(refresh, config.recording_poll_interval_ms);
        return () => {
            cancelled = true;
            window.clearInterval(t);
        };
    }, [cameraId, config.recording_poll_interval_ms]);

    const rawLatestMs = spans.length ? spans[spans.length - 1].endMs : null;
    const latestMs = rawLatestMs != null ? rawLatestMs - EDGE_SAFETY_MS : null;
    const earliestMs = spans.length ? spans[0].startMs : null;

    // ── Cleanup ─────────────────────────────────────────────────────────────
    const cleanupVideo = useCallback(async () => {
        const video = videoRef.current;
        if (video) {
            video.pause();
            video.removeAttribute('src');
            video.srcObject = null;
            video.load();
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (sessionUrlRef.current) {
            try {
                await fetch(sessionUrlRef.current, { method: 'DELETE' });
            } catch {
                /* ignore */
            }
            sessionUrlRef.current = null;
        }
    }, []);

    // ── Live (WebRTC / WHEP) ──────────────────────────────────────────────────
    const attachLive = useCallback(async () => {
        const video = videoRef.current;
        if (!video || !liveWebrtcUrl) return;

        try {
            await cleanupVideo();
            setStatus('connecting');
            setMode('live');

            const pc = new RTCPeerConnection({ iceServers: [] });
            pcRef.current = pc;
            const stream = new MediaStream();
            video.srcObject = stream;
            pc.ontrack = (e) => stream.addTrack(e.track);
            pc.addTransceiver('video', { direction: 'recvonly' });
            pc.addTransceiver('audio', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await new Promise<void>((resolve) => {
                if (pc.iceGatheringState === 'complete') return resolve();
                const check = () => {
                    if (pc.iceGatheringState === 'complete') {
                        pc.removeEventListener('icegatheringstatechange', check);
                        resolve();
                    }
                };
                pc.addEventListener('icegatheringstatechange', check);
            });

            const res = await fetch(`${liveWebrtcUrl}whep`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription?.sdp,
            });
            if (!res.ok) throw new Error(`WHEP ${res.status}`);

            const answer = await res.text();
            const loc = res.headers.get('location');
            if (loc) sessionUrlRef.current = new URL(loc, liveWebrtcUrl).toString();
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answer }));

            await video.play();
            setStatus('playing');
            setPaused(false);
            setIsAtLiveEdge(true);
            setDisplayMs(null);
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMsg('Failed to connect live stream');
        }
    }, [cleanupVideo, liveWebrtcUrl]);

    // ── DVR playback ──────────────────────────────────────────────────────────
    const attachPlayback = useCallback(
        async (src: string) => {
            const video = videoRef.current;
            if (!video) return;
            try {
                await cleanupVideo();
                setStatus('connecting');
                setMode('playback');
                video.src = src;
                video.onloadedmetadata = async () => {
                    const target = pendingSeekRef.current;
                    const clip = activeClipRef.current;
                    if (target != null && clip) {
                        video.currentTime = Math.max(0, (target - clip.startMs) / 1000);
                    }
                    video.playbackRate = speed;
                    await video.play();
                    pendingSeekRef.current = null;
                    setStatus('playing');
                    setPaused(false);
                };
                video.onerror = () => {
                    setStatus('error');
                    setErrorMsg('Recording playback failed');
                };
                video.load();
            } catch (err) {
                console.error(err);
                setStatus('error');
                setErrorMsg('Recording playback failed');
            }
        },
        [cleanupVideo, speed],
    );

    const findSpan = useCallback(
        (targetMs: number) =>
            spans.find((s) => targetMs >= s.startMs && targetMs < s.endMs) ??
            spans.find((s) => targetMs < s.startMs) ??
            spans[spans.length - 1],
        [spans],
    );

    const goLive = useCallback(() => {
        pendingSeekRef.current = null;
        activeClipRef.current = null;
        setErrorMsg(null);
        setIsAtLiveEdge(true);
        void attachLive();
    }, [attachLive]);

    const startPlaybackAt = useCallback(
        (targetMs: number) => {
            if (!playbackGetBaseUrl || spans.length === 0) {
                setMode('playback');
                setStatus('error');
                setErrorMsg('No recordings are available yet');
                return;
            }
            const span = findSpan(targetMs);
            if (!span || targetMs < spans[0].startMs || targetMs > spans[spans.length - 1].endMs) {
                setMode('playback');
                setStatus('error');
                setErrorMsg('No recording for this time (outside the retention window)');
                return;
            }

            const clipStart = Math.max(span.startMs, targetMs - config.playback_padding_before_s * 1000);
            const desiredEnd = targetMs + config.playback_padding_after_s * 1000;
            const maxEnd = clipStart + config.playback_max_duration_s * 1000;
            const minEnd = clipStart + config.playback_min_duration_s * 1000;
            const clipEnd = Math.min(span.endMs, Math.max(minEnd, Math.min(desiredEnd, maxEnd)));
            const durationS = Math.max(1, (clipEnd - clipStart) / 1000);
            const baseUrl = span.playback_get_base_url ?? playbackGetBaseUrl;

            const src =
                `${baseUrl}` +
                `&start=${encodeURIComponent(new Date(clipStart).toISOString())}` +
                `&duration=${durationS.toFixed(3)}`;

            pendingSeekRef.current = targetMs;
            activeClipRef.current = { startMs: clipStart, endMs: clipEnd };
            setIsAtLiveEdge(false);
            setErrorMsg(null);
            setDisplayMs(targetMs);
            void attachPlayback(src);
        },
        [attachPlayback, config, findSpan, playbackGetBaseUrl, spans],
    );

    // Seek to an absolute wall-clock time (jumps to live if near the edge).
    const seekToMs = useCallback(
        (targetMs: number) => {
            if (earliestMs == null || rawLatestMs == null) return;
            const clamped = Math.max(earliestMs, Math.min(rawLatestMs, targetMs));
            if (clamped >= rawLatestMs - EDGE_SAFETY_MS) {
                goLive();
                return;
            }
            // Seek inside the current clip without reloading when possible.
            const video = videoRef.current;
            const clip = activeClipRef.current;
            if (mode === 'playback' && video && clip && clamped >= clip.startMs && clamped < clip.endMs) {
                video.currentTime = Math.max(0, (clamped - clip.startMs) / 1000);
                void video.play();
                setPaused(false);
                setDisplayMs(clamped);
                return;
            }
            startPlaybackAt(clamped);
        },
        [earliestMs, goLive, mode, rawLatestMs, startPlaybackAt],
    );

    // Relative seek used by the ±10s / ±5min controls.
    const relativeSeek = useCallback(
        (deltaSec: number) => {
            const video = videoRef.current;
            let currentWall: number;
            if (mode === 'playback' && video && activeClipRef.current) {
                currentWall = activeClipRef.current.startMs + video.currentTime * 1000;
            } else {
                currentWall = latestMs ?? Date.now();
            }
            seekToMs(currentWall + deltaSec * 1000);
        },
        [latestMs, mode, seekToMs],
    );

    // ── Lifecycle: connect on mount / when the source changes ─────────────────
    useEffect(() => {
        if (initialSeekMs == null) {
            void attachLive();
        } else {
            setStatus('connecting');
            setMode('playback');
        }
        return () => {
            void cleanupVideo();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveWebrtcUrl, initialSeekMs]);

    // Once spans arrive, perform the requested initial DVR seek (one-shot).
    useEffect(() => {
        if (initialSeekMs == null || didInitialSeekRef.current || spans.length === 0) return;
        didInitialSeekRef.current = true;
        startPlaybackAt(initialSeekMs);
    }, [initialSeekMs, spans, startPlaybackAt]);

    // ── Position reporting ────────────────────────────────────────────────────
    const handleTimeUpdate = () => {
        if (mode !== 'playback') return;
        const video = videoRef.current;
        const clip = activeClipRef.current;
        if (!video || !clip) return;
        const wall = Math.min(clip.startMs + video.currentTime * 1000, clip.endMs);
        setDisplayMs(wall);
        const lagSec = latestMs != null ? Math.max(0, (latestMs - wall) / 1000) : 0;
        const live = lagSec <= config.live_edge_threshold_s;
        setIsAtLiveEdge(live);
        onPositionChange?.(wall, live);
    };

    // ── Simple controls ───────────────────────────────────────────────────────
    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            void video.play();
            setPaused(false);
        } else {
            video.pause();
            setPaused(true);
        }
    };

    const cycleSpeed = () => {
        const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
        setSpeed(next);
        if (videoRef.current) videoRef.current.playbackRate = next;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
    };

    const cycleFit = () => {
        const order: ObjectFit[] = ['contain', 'cover', 'fill'];
        setObjectFit(order[(order.indexOf(objectFit) + 1) % order.length]);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) void containerRef.current.requestFullscreen();
        else void document.exitFullscreen();
    };

    const screenshot = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${cameraName.replace(/\s+/g, '-')}-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };

    const overlayTime = useMemo(() => {
        if (mode === 'live' && isAtLiveEdge) return null;
        return displayMs != null ? fmtClock(displayMs) : null;
    }, [displayMs, isAtLiveEdge, mode]);

    const isLiveNow = mode === 'live' && isAtLiveEdge;

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div ref={containerRef} className="flex flex-col w-full h-full bg-black">
            {/* Video */}
            <div className="relative flex-1 min-h-0 bg-gray-900 overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    className="w-full h-full"
                    style={{ objectFit }}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => mode === 'playback' && goLive()}
                />

                {(status === 'connecting' || status === 'idle') && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                        <i className="pi pi-spin pi-spinner text-3xl text-blue-400" />
                        <span className="text-sm text-gray-300">
                            {mode === 'live' ? 'Connecting to live stream…' : 'Loading recording…'}
                        </span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                        <i className="pi pi-exclamation-triangle text-3xl text-red-400" />
                        <span className="text-sm text-red-300">{errorMsg}</span>
                        <button
                            onClick={goLive}
                            className="mt-1 px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        >
                            Go live
                        </button>
                    </div>
                )}

                {/* Status / timestamp overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-md px-2.5 py-1 pointer-events-none">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            isLiveNow ? 'bg-red-500 animate-pulse' : status === 'error' ? 'bg-red-500' : 'bg-blue-400'
                        }`}
                    />
                    <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                        {isLiveNow ? 'LIVE' : status === 'playing' ? 'DVR' : status.toUpperCase()}
                    </span>
                </div>

                {overlayTime && (
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1.5 rounded-md text-sm font-mono pointer-events-none">
                        {overlayTime}
                    </div>
                )}

                {objectFit !== 'contain' && (
                    <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-xs pointer-events-none">
                        {objectFit === 'cover' ? 'Fill' : 'Stretch'}
                    </div>
                )}
            </div>

            {/* Control bar */}
            <div
                className={`flex items-center gap-1 px-3 bg-white border-t border-gray-200 flex-shrink-0 ${
                    compact ? 'h-11' : 'h-14'
                }`}
            >
                {/* Camera badge */}
                <div className="flex items-center gap-2 mr-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <i className="pi pi-video text-white text-sm" />
                    </div>
                    <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                            isLiveNow ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
                        }`}
                    />
                    {!compact && (
                        <span className="text-sm font-semibold text-gray-800 truncate max-w-[10rem]">
                            {cameraName}
                        </span>
                    )}
                </div>

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Ctrl icon="pi-step-backward" title="Back 5 min" onClick={() => relativeSeek(-300)} />
                <Ctrl icon="pi-replay" title="Back 10s" onClick={() => relativeSeek(-10)} />
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md transition"
                    title={paused ? 'Play' : 'Pause'}
                >
                    <i className={`pi ${paused ? 'pi-play' : 'pi-pause'} text-base`} />
                </button>
                <Ctrl icon="pi-refresh" title="Forward 10s" onClick={() => relativeSeek(10)} />
                <Ctrl icon="pi-step-forward" title="Forward 5 min" onClick={() => relativeSeek(300)} />

                <div className="w-px h-6 bg-gray-200 mx-1" />

                <Ctrl icon="pi-arrows-alt" title="Aspect ratio" onClick={cycleFit} />
                <Ctrl icon={muted ? 'pi-volume-off' : 'pi-volume-up'} title={muted ? 'Unmute' : 'Mute'} onClick={toggleMute} />
                <button
                    onClick={cycleSpeed}
                    className="h-8 px-2 text-xs font-bold text-gray-700 hover:text-blue-600 hover:bg-gray-100 rounded-md transition"
                    title="Playback speed"
                >
                    {speed}x
                </button>
                <Ctrl icon="pi-window-maximize" title="Fullscreen" onClick={toggleFullscreen} />
                <Ctrl icon="pi-camera" title="Screenshot" onClick={screenshot} />

                {!isLiveNow && (
                    <button
                        onClick={goLive}
                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500 hover:bg-green-400 text-white rounded-md transition"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                    </button>
                )}
            </div>
        </div>
    );
};

const Ctrl = ({ icon, title, onClick }: { icon: string; title: string; onClick: () => void }) => (
    <button
        onClick={onClick}
        title={title}
        className="w-9 h-9 flex items-center justify-center rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition flex-shrink-0"
    >
        <i className={`pi ${icon} text-base`} />
    </button>
);
