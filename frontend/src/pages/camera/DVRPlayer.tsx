import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';

import {
    cameraService,
    type RecordingSpan,
    type StreamConfig,
} from './api/cameraService';

import type {
    CameraEvent,
    DVRPlayerProps,
} from './types/index';

type PlayerStatus =
    | 'idle'
    | 'connecting'
    | 'playing'
    | 'error';

type PlayerMode =
    | 'live'
    | 'playback';

type NormalizedSpan = RecordingSpan & {
    startMs: number;
    endMs: number;
};

type ActiveClip = {
    startMs: number;
    endMs: number;
};

const DVR_WINDOW_HOURS = 12;

const DVR_WINDOW_MINUTES =
    DVR_WINDOW_HOURS * 60;

const DVR_EDGE_SAFETY_MS = 5000;

const DEFAULT_STREAM_CONFIG: StreamConfig = {
    recording_poll_interval_ms: 2000,
    live_edge_threshold_s: 20,
    playback_format: 'fmp4',
    playback_padding_before_s: 30,
    playback_padding_after_s: 300,
    playback_min_duration_s: 60,
    playback_max_duration_s: 900,
};

const formatTimelineLabel = (
    timestampMs: number
) => {
    const wallTime = new Date(timestampMs);

    return wallTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

export const DVRPlayer = ({
    cameraId,
    liveWebrtcUrl,
    playbackGetBaseUrl,
    rtspUrl,
    events = [],
    streamConfig,
}: DVRPlayerProps) => {
    const config =
        streamConfig ??
        DEFAULT_STREAM_CONFIG;

    const videoRef =
        useRef<HTMLVideoElement>(null);

    const timelineRef =
        useRef<HTMLDivElement>(null);

    const peerConnectionRef =
        useRef<RTCPeerConnection | null>(
            null
        );

    const sessionUrlRef =
        useRef<string | null>(null);

    const isDraggingRef =
        useRef(false);

    const pendingSeekRef =
        useRef<number | null>(null);

    const activeClipRef =
        useRef<ActiveClip | null>(null);

    const [mode, setMode] =
        useState<PlayerMode>('live');

    const [status, setStatus] =
        useState<PlayerStatus>('idle');

    const [errorMsg, setErrorMsg] =
        useState<string | null>(null);

    const [sliderValue, setSliderValue] =
        useState(DVR_WINDOW_MINUTES);

    const [timeLabel, setTimeLabel] =
        useState('LIVE');

    const [isAtLiveEdge, setIsAtLiveEdge] =
        useState(true);

    const [spans, setSpans] = useState<
        RecordingSpan[]
    >([]);

    const normalizedSpans = useMemo<
        NormalizedSpan[]
    >(
        () =>
            spans
                .map((span) => ({
                    ...span,
                    startMs: new Date(
                        span.start
                    ).getTime(),
                    endMs: new Date(
                        span.end
                    ).getTime(),
                }))
                .sort(
                    (a, b) =>
                        a.startMs - b.startMs
                ),
        [spans]
    );

    const rawLatestMs =
        normalizedSpans[
            normalizedSpans.length - 1
        ]?.endMs ?? null;

    const latestMs =
        rawLatestMs !== null
            ? rawLatestMs -
              DVR_EDGE_SAFETY_MS
            : null;

    const earliestMs =
        latestMs !== null
            ? latestMs -
              DVR_WINDOW_HOURS *
                  60 *
                  60 *
                  1000
            : null;

    /**
     * RECORDING SPANS
     */
    useEffect(() => {
        if (!cameraId) {
            return undefined;
        }

        let cancelled = false;

        const refresh = async () => {
            try {
                const { data } =
                    await cameraService.getRecordingSpans(
                        cameraId
                    );

                if (cancelled) {
                    return;
                }

                setSpans(data.spans);
            } catch {
                if (!cancelled) {
                    setErrorMsg(
                        'Failed to load recordings'
                    );
                }
            }
        };

        void refresh();

        const timer =
            window.setInterval(
                refresh,
                config.recording_poll_interval_ms
            );

        return () => {
            cancelled = true;

            window.clearInterval(timer);
        };
    }, [
        cameraId,
        config.recording_poll_interval_ms,
    ]);

    /**
     * CLEANUP
     */
    const cleanupVideo = async () => {
        const video = videoRef.current;

        if (video) {
            video.pause();

            video.removeAttribute(
                'src'
            );

            video.srcObject = null;

            video.load();
        }

        if (
            peerConnectionRef.current
        ) {
            peerConnectionRef.current.close();

            peerConnectionRef.current =
                null;
        }

        /**
         * Close WHEP session
         */
        if (
            sessionUrlRef.current
        ) {
            try {
                await fetch(
                    sessionUrlRef.current,
                    {
                        method:
                            'DELETE',
                    }
                );
            } catch {}

            sessionUrlRef.current =
                null;
        }
    };

    /**
     * LIVE WEBRTC
     *
     * Works with MediaMTX WHEP.
     *
     * Example URL:
     * http://localhost:8889/mystream/whep
     */
    const attachLiveStream =
        async () => {
            const video =
                videoRef.current;

            if (
                !video ||
                !liveWebrtcUrl
            ) {
                return;
            }

            try {
                await cleanupVideo();

                setStatus(
                    'connecting'
                );

                const pc =
                    new RTCPeerConnection({
                        iceServers: [],
                    });

                peerConnectionRef.current =
                    pc;

                const stream =
                    new MediaStream();

                video.srcObject =
                    stream;

                pc.ontrack = (
                    event
                ) => {
                    stream.addTrack(
                        event.track
                    );
                };

                /**
                 * Receive only
                 */
                pc.addTransceiver(
                    'video',
                    {
                        direction:
                            'recvonly',
                    }
                );

                pc.addTransceiver(
                    'audio',
                    {
                        direction:
                            'recvonly',
                    }
                );

                /**
                 * SDP OFFER
                 */
                const offer =
                    await pc.createOffer();

                await pc.setLocalDescription(
                    offer
                );

                /**
                 * Wait ICE gathering
                 */
                await new Promise<void>(
                    (
                        resolve
                    ) => {
                        if (
                            pc.iceGatheringState ===
                            'complete'
                        ) {
                            resolve();

                            return;
                        }

                        const checkState =
                            () => {
                                if (
                                    pc.iceGatheringState ===
                                    'complete'
                                ) {
                                    pc.removeEventListener(
                                        'icegatheringstatechange',
                                        checkState
                                    );

                                    resolve();
                                }
                            };

                        pc.addEventListener(
                            'icegatheringstatechange',
                            checkState
                        );
                    }
                );

                /**
                 * SEND OFFER
                 */
                const response =
                    await fetch(
                        `${liveWebrtcUrl}whep`,
                        {
                            method:
                                'POST',
                            headers:
                                {
                                    'Content-Type':
                                        'application/sdp',
                                },
                            body:
                                pc.localDescription
                                    ?.sdp,
                        }
                    );

                if (
                    !response.ok
                ) {
                    throw new Error(
                        `WHEP failed: ${response.status}`
                    );
                }

                /**
                 * MediaMTX returns SDP answer
                 */
                const answerSdp =
                    await response.text();

                /**
                 * Store session URL
                 */
                const sessionUrl =
                    response.headers.get(
                        'location'
                    );

                if (
                    sessionUrl
                ) {
                    sessionUrlRef.current =
                        new URL(
                            sessionUrl,
                            liveWebrtcUrl
                        ).toString();
                }

                /**
                 * REMOTE SDP
                 */
                await pc.setRemoteDescription(
                    new RTCSessionDescription(
                        {
                            type:
                                'answer',
                            sdp: answerSdp,
                        }
                    )
                );

                /**
                 * PLAY
                 */
                await video.play();

                setMode(
                    'live'
                );

                setStatus(
                    'playing'
                );

                setTimeLabel(
                    'LIVE'
                );

                setIsAtLiveEdge(
                    true
                );
            } catch (
                err
            ) {
                console.error(
                    err
                );

                setStatus(
                    'error'
                );

                setErrorMsg(
                    'Failed to connect live stream'
                );
            }
        };

    /**
     * DVR PLAYBACK
     */
    const attachPlaybackStream =
        async (
            src: string
        ) => {
            const video =
                videoRef.current;

            if (!video) {
                return;
            }

            try {
                await cleanupVideo();

                setStatus(
                    'connecting'
                );

                video.src =
                    src;

                video.onloadedmetadata =
                    async () => {
                        const targetMs =
                            pendingSeekRef.current;

                        const activeClip =
                            activeClipRef.current;

                        if (
                            targetMs !==
                                null &&
                            activeClip
                        ) {
                            video.currentTime =
                                Math.max(
                                    0,
                                    (
                                        targetMs -
                                        activeClip.startMs
                                    ) / 1000
                                );
                        }
                        updatePlaybackPosition();
                        await video.play();

                        pendingSeekRef.current =
                            null;

                        setStatus(
                            'playing'
                        );
                    };

                video.onerror =
                    () => {
                        setStatus(
                            'error'
                        );

                        setErrorMsg(
                            'Recording playback failed'
                        );
                    };

                video.load();
            } catch (
                err
            ) {
                console.error(
                    err
                );

                setStatus(
                    'error'
                );

                setErrorMsg(
                    'Recording playback failed'
                );
            }
        };

    /**
     * INITIAL LIVE
     */
    useEffect(() => {
        if (
            liveWebrtcUrl
        ) {
            void attachLiveStream();
        }

        return () => {
            void cleanupVideo();
        };
    }, [
        liveWebrtcUrl,
    ]);

    /**
     * GO LIVE
     */
    const goLive =
        async () => {
            pendingSeekRef.current =
                null;

            activeClipRef.current =
                null;

            setMode(
                'live'
            );

            setErrorMsg(
                null
            );

            setSliderValue(
                DVR_WINDOW_MINUTES
            );

            setTimeLabel(
                'LIVE'
            );

            setIsAtLiveEdge(
                true
            );

            await attachLiveStream();
        };

    const setPlaybackStateFromTimestamp =
        (
            timestampMs: number
        ) => {
            if (
                latestMs ===
                    null ||
                earliestMs ===
                    null
            ) {
                return;
            }

            const lagSec =
                Math.max(
                    0,
                    (
                        latestMs -
                        timestampMs
                    ) / 1000
                );

            setSliderValue(
                (
                    timestampMs -
                    earliestMs
                ) / 60000
            );

            if (
                lagSec <=
                config.live_edge_threshold_s
            ) {
                setIsAtLiveEdge(
                    true
                );

                setTimeLabel(
                    'LIVE'
                );

                return;
            }

            setIsAtLiveEdge(
                false
            );

            setTimeLabel(
                formatTimelineLabel(
                    timestampMs
                )
            );
        };

    const updatePlaybackPosition =
        () => {
            const video =
                videoRef.current;

            const activeClip =
                activeClipRef.current;

            if (
                !video ||
                !activeClip
            ) {
                return;
            }

            const currentWallClockMs =
                Math.min(
                    activeClip.startMs +
                        video.currentTime *
                            1000,
                    activeClip.endMs
                );

            setPlaybackStateFromTimestamp(
                currentWallClockMs
            );
        };

    const findSpanForTimestamp =
        (
            targetMs: number
        ) =>
            normalizedSpans.find(
                (
                    item
                ) =>
                    targetMs >=
                        item.startMs &&
                    targetMs <
                        item.endMs
            ) ??
            normalizedSpans.find(
                (
                    item
                ) =>
                    targetMs <
                    item.startMs
            ) ??
            normalizedSpans[
                normalizedSpans.length -
                    1
            ];

    const seekWithinActiveClip =
        (
            targetMs: number
        ) => {
            const video =
                videoRef.current;

            const activeClip =
                activeClipRef.current;

            if (
                !video ||
                !activeClip
            ) {
                return false;
            }

            if (
                targetMs <
                    activeClip.startMs ||
                targetMs >=
                    activeClip.endMs
            ) {
                return false;
            }

            video.currentTime =
                Math.max(
                    0,
                    (
                        targetMs -
                        activeClip.startMs
                    ) / 1000
                );

            void video.play();

            setMode(
                'playback'
            );

            setStatus(
                'playing'
            );

            setPlaybackStateFromTimestamp(
                targetMs
            );

            return true;
        };

    const startPlaybackAt =
        async (
            targetMs: number
        ) => {
            if (
                !playbackGetBaseUrl ||
                normalizedSpans.length ===
                    0
            ) {
                setStatus(
                    'error'
                );

                setErrorMsg(
                    'No recordings are available yet'
                );

                return;
            }

            if (
                seekWithinActiveClip(
                    targetMs
                )
            ) {
                return;
            }

            const span =
                findSpanForTimestamp(
                    targetMs
                );

            const clipStartMs =
                Math.max(
                    span.startMs,
                    targetMs -
                        config.playback_padding_before_s *
                            1000
                );

            const desiredEndMs =
                targetMs +
                config.playback_padding_after_s *
                    1000;

            const maxEndMs =
                clipStartMs +
                config.playback_max_duration_s *
                    1000;

            const minEndMs =
                clipStartMs +
                config.playback_min_duration_s *
                    1000;

            const clipEndMs =
                Math.min(
                    span.endMs,
                    Math.max(
                        minEndMs,
                        Math.min(
                            desiredEndMs,
                            maxEndMs
                        )
                    )
                );

            const clipDurationS =
                Math.max(
                    1,
                    (
                        clipEndMs -
                        clipStartMs
                    ) / 1000
                );

            const src =
                `${playbackGetBaseUrl}` +
                `&start=${encodeURIComponent(
                    new Date(
                        clipStartMs
                    ).toISOString()
                )}` +
                `&duration=${clipDurationS.toFixed(
                    3
                )}`;

            pendingSeekRef.current =
                targetMs;

            activeClipRef.current =
                {
                    startMs:
                        clipStartMs,
                    endMs:
                        clipEndMs,
                };

            setMode(
                'playback'
            );

            setIsAtLiveEdge(
                false
            );

            setErrorMsg(
                null
            );

            await attachPlaybackStream(
                src
            );
        };

    const handleSeekTarget =
        (
            targetMs: number
        ) => {
            if (
                earliestMs ===
                    null ||
                latestMs ===
                    null
            ) {
                return;
            }

            const clampedTargetMs =
                Math.max(
                    earliestMs,
                    Math.min(
                        latestMs,
                        targetMs
                    )
                );

            /**
             * Near live edge
             */
            if (
                rawLatestMs !==
                    null &&
                clampedTargetMs >=
                    rawLatestMs -
                        DVR_EDGE_SAFETY_MS
            ) {
                void goLive();

                return;
            }

            void startPlaybackAt(
                clampedTargetMs
            );
        };

    const handleSliderChange =
        (
            val: number
        ) => {
            if (
                earliestMs ===
                    null ||
                latestMs ===
                    null
            ) {
                return;
            }

            setSliderValue(
                val
            );

            handleSeekTarget(
                earliestMs +
                    val *
                        60000
            );
        };

    const nudge = (
        deltaMin: number
    ) =>
        handleSliderChange(
            Math.max(
                0,
                Math.min(
                    DVR_WINDOW_MINUTES,
                    sliderValue +
                        deltaMin
                )
            )
        );

    const clientXToValue =
        (
            clientX: number
        ): number => {
            const el =
                timelineRef.current;

            if (!el) {
                return 0;
            }

            const rect =
                el.getBoundingClientRect();

            return Math.max(
                0,
                Math.min(
                    DVR_WINDOW_MINUTES,
                    (
                        (
                            clientX -
                            rect.left
                        ) /
                        rect.width
                    ) *
                        DVR_WINDOW_MINUTES
                )
            );
        };

    const handleTrackPointerDown =
        (
            e: ReactPointerEvent<HTMLDivElement>
        ) => {
            e.currentTarget.setPointerCapture(
                e.pointerId
            );

            isDraggingRef.current =
                true;

            setSliderValue(
                clientXToValue(
                    e.clientX
                )
            );
        };

    const handleTrackPointerMove =
        (
            e: ReactPointerEvent<HTMLDivElement>
        ) => {
            if (
                !isDraggingRef.current
            ) {
                return;
            }

            setSliderValue(
                clientXToValue(
                    e.clientX
                )
            );
        };

    const handleTrackPointerUp =
        (
            e: ReactPointerEvent<HTMLDivElement>
        ) => {
            if (
                !isDraggingRef.current
            ) {
                return;
            }

            isDraggingRef.current =
                false;

            handleSliderChange(
                clientXToValue(
                    e.clientX
                )
            );
        };

    const eventToPercent =
        (
            ev: CameraEvent
        ): number => {
            if (
                earliestMs ===
                    null ||
                latestMs ===
                    null ||
                latestMs ===
                    earliestMs
            ) {
                return -1;
            }

            return (
                (
                    (
                        ev.timestamp.getTime() -
                        earliestMs
                    ) /
                    (
                        latestMs -
                        earliestMs
                    )
                ) * 100
            );
        };

    const seekToEvent = (
        ev: CameraEvent
    ) => {
        handleSeekTarget(
            ev.timestamp.getTime()
        );
    };

    const fillPct = `${
        (sliderValue /
            DVR_WINDOW_MINUTES) *
        100
    }%`;

    const visibleEvs =
        events.filter(
            (ev) => {
                const pct =
                    eventToPercent(
                        ev
                    );

                return (
                    pct >= 0 &&
                    pct <= 100
                );
            }
        );

    const statusDotColor =
        status ===
        'connecting'
            ? 'bg-yellow-400 animate-pulse'
            : status ===
              'error'
            ? 'bg-red-500'
            : status ===
              'playing'
            ? mode ===
                  'live' ||
              isAtLiveEdge
                ? 'bg-green-500'
                : 'bg-purple-400'
            : 'bg-gray-400';

    const statusLabel =
        status ===
        'playing'
            ? mode ===
                  'live' ||
              isAtLiveEdge
                ? 'LIVE'
                : `DVR · ${timeLabel}`
            : status ===
              'connecting'
            ? 'CONNECTING'
            : status ===
              'error'
            ? 'ERROR'
            : 'IDLE';

    return (
        <div
            className="relative bg-black rounded-xl overflow-hidden select-none"
            style={{
                aspectRatio:
                    '16/9',
            }}
        >
            {(status ===
                'connecting' ||
                status ===
                    'idle') && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white">
                    <i className="pi pi-spin pi-spinner text-3xl text-purple-400" />

                    <span className="text-sm text-gray-300">
                        {mode ===
                        'live'
                            ? 'Connecting to live stream…'
                            : 'Loading recording…'}
                    </span>
                </div>
            )}

            {status ===
                'error' && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                    <i className="pi pi-exclamation-triangle text-3xl text-red-400" />

                    <span className="text-sm text-red-300 text-center px-6">
                        {errorMsg}
                    </span>

                    <button
                        onClick={() =>
                            void goLive()
                        }
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
                controls={false}
                className="w-full h-full object-contain"
                onTimeUpdate={() => {
                    if (
                        mode ===
                        'playback'
                    ) {
                        updatePlaybackPosition();
                    }
                }}
                onEnded={() => {
                    if (
                        mode ===
                        'playback'
                    ) {
                        void goLive();
                    }
                }}
            />

            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
                <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor}`}
                />

                <span className="text-[11px] font-semibold text-white/90 leading-none tracking-wide">
                    {statusLabel}
                </span>
            </div>

            {status ===
                'playing' && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-14 pb-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[11px] font-medium text-white/50 mb-0.5 px-0.5">
                        <span>
                            ← 12h ago
                        </span>

                        <span>
                            NOW →
                        </span>
                    </div>

                    <div
                        className="relative"
                        style={{
                            paddingTop:
                                '28px',
                        }}
                    >
                        {visibleEvs.map(
                            (
                                ev
                            ) => {
                                const pct =
                                    eventToPercent(
                                        ev
                                    );

                                return (
                                    <div
                                        key={
                                            ev.id
                                        }
                                        className="absolute top-0 flex flex-col items-center group z-10"
                                        style={{
                                            left: `${pct}%`,
                                            transform:
                                                'translateX(-50%)',
                                        }}
                                    >
                                        <button
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md ${ev.color} hover:scale-125 active:scale-110 transition-transform`}
                                            onClick={() =>
                                                seekToEvent(
                                                    ev
                                                )
                                            }
                                        >
                                            <i
                                                className={`pi ${ev.icon}`}
                                                style={{
                                                    fontSize:
                                                        '8px',
                                                }}
                                            />
                                        </button>

                                        <div
                                            className={`w-px h-1.5 ${ev.color} opacity-60`}
                                        />
                                    </div>
                                );
                            }
                        )}

                        <div
                            ref={
                                timelineRef
                            }
                            className="relative h-1.5 rounded-full select-none overflow-visible cursor-pointer"
                            style={{
                                background:
                                    'rgba(255,255,255,0.18)',
                            }}
                            onPointerDown={
                                handleTrackPointerDown
                            }
                            onPointerMove={
                                handleTrackPointerMove
                            }
                            onPointerUp={
                                handleTrackPointerUp
                            }
                        >
                            <div
                                className="absolute inset-y-0 left-0 bg-purple-400 rounded-full pointer-events-none"
                                style={{
                                    width:
                                        fillPct,
                                }}
                            />

                            <div
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-purple-400 rounded-full shadow-lg pointer-events-none z-10"
                                style={{
                                    left: fillPct,
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                        <button
                            onClick={() =>
                                nudge(
                                    -10 /
                                        60
                                )
                            }
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25 text-white rounded-md transition"
                        >
                            ← 10s
                        </button>

                        <button
                            onClick={() =>
                                nudge(
                                    -30
                                )
                            }
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25 text-white rounded-md transition"
                        >
                            ← 30m
                        </button>

                        <button
                            onClick={() =>
                                nudge(
                                    30
                                )
                            }
                            className="px-2.5 py-1 text-[11px] bg-white/15 hover:bg-white/25 text-white rounded-md transition"
                        >
                            30m →
                        </button>

                        <div className="ml-auto flex items-center gap-2">
                            {rtspUrl && (
                                <span className="hidden sm:inline font-mono text-[10px] text-white/25 truncate max-w-[180px]">
                                    {
                                        rtspUrl
                                    }
                                </span>
                            )}

                            {(mode !==
                                'live' ||
                                !isAtLiveEdge) && (
                                <button
                                    onClick={() =>
                                        void goLive()
                                    }
                                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold bg-green-500 hover:bg-green-400 text-white rounded-md transition"
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