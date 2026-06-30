import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventService } from './api/eventService';
import { cameraService } from '../camera/api/cameraService';
import { NvrPlayer } from './components/NvrPlayer';
import { SplitEvidenceView } from './components/SplitEvidenceView';
import { EventModeToggle } from './components/EventModeToggle';
import {
    visualForUsecase,
    minuteOfDay,
    isSameLocalDay,
    dayMinuteToMs,
} from './eventTimelineUtils';
import type { Event } from './types/index';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const RETENTION_DAYS = 7;
const ZOOM_MIN = 1.2;
const ZOOM_MAX = 6;

const ALL_MINS: number[] = [];
for (let h = 23; h >= 0; h--) {
    for (let m = 59; m >= 0; m--) ALL_MINS.push(h * 60 + m);
}

function fmtMin(totalMin: number, secs = false) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const ampm = h < 12 ? 'AM' : 'PM';
    const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const mm = String(m).padStart(2, '0');
    return secs ? `${hh}:${mm}:00 ${ampm}` : `${hh}:${mm} ${ampm}`;
}

const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};

const toDateInputValue = (d: Date) => {
    const x = startOfDay(d);
    const off = x.getTimezoneOffset() * 60_000;
    return new Date(x.getTime() - off).toISOString().slice(0, 10);
};

// ─────────────────────────────────────────────────────────────────────────────
// Evidence thumbnail (first frame of the evidence video, or an icon fallback)
// ─────────────────────────────────────────────────────────────────────────────
const EventThumb = ({ ev }: { ev: Event }) => {
    if (ev.evidence_url) {
        return (
            <video
                src={`${ev.evidence_url}#t=0.5`}
                muted
                preload="metadata"
                className="rounded border border-gray-200 shadow-sm object-cover w-14 h-10 bg-gray-800"
            />
        );
    }
    const v = visualForUsecase(ev.usecase_name);
    return (
        <div className="rounded border border-gray-200 shadow-sm w-14 h-10 bg-gray-100 flex items-center justify-center">
            <i className={`pi ${v.icon} ${v.text} text-sm`} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const EventTimeline = () => {
    const [tab, setTab] = useState<'timeline' | 'detections'>('timeline');
    const [selectedCameraId, setSelectedCameraId] = useState<number | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
    const [split, setSplit] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [singleSeekMs, setSingleSeekMs] = useState<number | null>(null);
    const [cur, setCur] = useState(12 * 60);
    const [dragging, setDragging] = useState(false);
    const [pxPerMin, setPxPerMin] = useState(2.2);

    const tlRef = useRef<HTMLDivElement>(null);

    // ── Data ──────────────────────────────────────────────────────────────────
    const { data: cameras = [] } = useQuery({
        queryKey: ['cameras'],
        queryFn: () => cameraService.getCameras().then((r) => r.data.cameras),
    });

    const { data: allEvents = [] } = useQuery({
        queryKey: ['events'],
        queryFn: () => eventService.getEvents().then((r) => r.data.events),
        placeholderData: (prev) => prev,
    });

    useEffect(() => {
        if (selectedCameraId !== null) return;
        if (allEvents.length) {
            const top = [...allEvents].sort(
                (a, b) =>
                    new Date(b.event_start_time).getTime() - new Date(a.event_start_time).getTime(),
            )[0];
            setSelectedCameraId(top.camera_id);
        } else if (cameras.length) {
            setSelectedCameraId(cameras[0].id);
        }
    }, [allEvents, cameras, selectedCameraId]);

    const { data: streamInfo = null } = useQuery({
        queryKey: ['stream-info', selectedCameraId],
        queryFn: () => cameraService.getStreamInfo(selectedCameraId!).then((r) => r.data),
        enabled: selectedCameraId !== null,
    });

    const selectedCamera = cameras.find((c) => c.id === selectedCameraId) ?? null;
    const cameraName = selectedCamera?.name_en ?? selectedCamera?.name ?? 'Camera';

    // ── Derived event sets ──────────────────────────────────────────────────────
    const dayEvents = useMemo(
        () =>
            allEvents
                .filter(
                    (e) =>
                        e.camera_id === selectedCameraId &&
                        isSameLocalDay(e.event_start_time, selectedDate),
                )
                .sort(
                    (a, b) =>
                        new Date(a.event_start_time).getTime() -
                        new Date(b.event_start_time).getTime(),
                ),
        [allEvents, selectedCameraId, selectedDate],
    );

    const detMap = useMemo(() => {
        const m = new Map<number, Event>();
        dayEvents.forEach((e) => m.set(minuteOfDay(e.event_start_time), e));
        return m;
    }, [dayEvents]);

    const bars = useMemo(
        () =>
            dayEvents.map((e) => {
                const s = minuteOfDay(e.event_start_time);
                const end = isSameLocalDay(e.event_end_time, selectedDate)
                    ? minuteOfDay(e.event_end_time)
                    : 1439;
                return [s, Math.max(end, s + 1)] as [number, number];
            }),
        [dayEvents, selectedDate],
    );

    const canvasH = ALL_MINS.length * pxPerMin;

    // ── Timeline geometry ───────────────────────────────────────────────────────
    const minToY = useCallback(
        (m: number) => {
            const i = ALL_MINS.indexOf(m);
            return i >= 0 ? i * pxPerMin + pxPerMin / 2 : 0;
        },
        [pxPerMin],
    );

    const clientYToMin = useCallback(
        (clientY: number) => {
            if (!tlRef.current) return cur;
            const { top } = tlRef.current.getBoundingClientRect();
            const rel = clientY - top + tlRef.current.scrollTop;
            const idx = Math.max(0, Math.min(ALL_MINS.length - 1, Math.round(rel / pxPerMin)));
            return ALL_MINS[idx];
        },
        [cur, pxPerMin],
    );

    // Center on the current marker on first paint.
    useEffect(() => {
        if (!tlRef.current) return;
        const i = ALL_MINS.indexOf(cur);
        tlRef.current.scrollTop = Math.max(0, i * pxPerMin - tlRef.current.clientHeight / 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Interactions ────────────────────────────────────────────────────────────
    const seekRecorded = useCallback(
        (minute: number) => {
            setCur(minute);
            setSplit(false);
            setSelectedEvent(null);
            setSingleSeekMs(dayMinuteToMs(selectedDate, minute));
        },
        [selectedDate],
    );

    const openEvent = (ev: Event) => {
        setSelectedEvent(ev);
        setCur(minuteOfDay(ev.event_start_time));
        setSplit(true);
    };

    const backToLive = () => {
        setSplit(false);
        setSelectedEvent(null);
        setSingleSeekMs(null);
    };

    const handlePosition = useCallback(
        (wallMs: number | null) => {
            if (wallMs == null) return;
            const d = new Date(wallMs);
            if (d.toDateString() === selectedDate.toDateString()) {
                setCur(d.getHours() * 60 + d.getMinutes());
            }
        },
        [selectedDate],
    );

    const onMove = useCallback(
        (e: MouseEvent) => {
            if (dragging) setCur(clientYToMin(e.clientY));
        },
        [dragging, clientYToMin],
    );
    const onUp = useCallback(
        (e: MouseEvent) => {
            if (dragging) {
                setDragging(false);
                seekRecorded(clientYToMin(e.clientY));
            }
        },
        [dragging, clientYToMin, seekRecorded],
    );

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [dragging, onMove, onUp]);

    // Reset to live when switching cameras.
    useEffect(() => {
        setSplit(false);
        setSelectedEvent(null);
        setSingleSeekMs(null);
    }, [selectedCameraId]);

    const curY = minToY(cur);

    // ── Date navigation (bounded to the retention window) ─────────────────────────
    const today = startOfDay(new Date());
    const minDate = new Date(today.getTime() - (RETENTION_DAYS - 1) * 86_400_000);
    const dateLabel = selectedDate.toLocaleDateString([], {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col bg-white overflow-hidden h-full min-h-0">
            {/* TOP HEADER */}
            <div className="flex items-center justify-between px-5 bg-white border-b border-gray-200 flex-shrink-0 h-12 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold tracking-widest text-gray-800 uppercase whitespace-nowrap">
                        Event Information
                    </span>
                    {cameras.length > 0 && (
                        <select
                            value={selectedCameraId ?? ''}
                            onChange={(e) => setSelectedCameraId(Number(e.target.value))}
                            className="text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer"
                        >
                            {cameras.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name_en ?? c.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                <EventModeToggle mode="timeline" />
            </div>

            {/* MAIN */}
            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* LEFT — player */}
                <div
                    className="flex flex-col overflow-hidden bg-black min-h-0"
                    style={{ width: '100%', maxWidth: '70vw' }}
                >
                    {selectedCameraId === null ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                            No camera available.
                        </div>
                    ) : split && selectedEvent ? (
                        <SplitEvidenceView
                            key={`split-${selectedEvent.id}`}
                            event={selectedEvent}
                            cameraId={selectedCameraId}
                            cameraName={cameraName}
                            streamInfo={streamInfo}
                            onBack={backToLive}
                        />
                    ) : (
                        <NvrPlayer
                            key={`single-${selectedCameraId}-${singleSeekMs ?? 'live'}`}
                            cameraId={selectedCameraId}
                            cameraName={cameraName}
                            liveWebrtcUrl={streamInfo?.live_webrtc_url ?? null}
                            playbackGetBaseUrl={streamInfo?.playback_get_base_url ?? null}
                            streamConfig={streamInfo?.stream_config ?? null}
                            initialSeekMs={singleSeekMs}
                            onPositionChange={handlePosition}
                        />
                    )}
                </div>

                {/* RIGHT — timeline panel */}
                <div className="flex flex-col flex-1 bg-white border-l border-gray-200 overflow-hidden min-w-[18rem]">
                    {/* Date + zoom header */}
                    <div className="flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0 h-11 gap-2">
                        <label className="relative flex items-center gap-1 text-sm font-semibold text-gray-800 cursor-pointer hover:text-blue-600">
                            {dateLabel}
                            <i className="pi pi-chevron-down text-[10px]" />
                            <input
                                type="date"
                                value={toDateInputValue(selectedDate)}
                                min={toDateInputValue(minDate)}
                                max={toDateInputValue(today)}
                                onChange={(e) =>
                                    e.target.value && setSelectedDate(startOfDay(new Date(e.target.value)))
                                }
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </label>
                        <div className="flex items-center gap-2">
                            <i className="pi pi-search-minus text-gray-400 text-xs" />
                            <input
                                type="range"
                                min={ZOOM_MIN}
                                max={ZOOM_MAX}
                                step={0.1}
                                value={pxPerMin}
                                onChange={(e) => setPxPerMin(Number(e.target.value))}
                                className="w-16 accent-blue-500 cursor-pointer"
                            />
                            <i className="pi pi-search-plus text-gray-400 text-xs" />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 flex-shrink-0">
                        {(['timeline', 'detections'] as const).map((tName) => (
                            <button
                                key={tName}
                                onClick={() => setTab(tName)}
                                className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                                    tab === tName
                                        ? 'text-blue-600 border-b-2 border-blue-600'
                                        : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                {tName}
                            </button>
                        ))}
                    </div>

                    {tab === 'timeline' ? (
                        <div
                            ref={tlRef}
                            className="flex-1 overflow-y-auto relative"
                            style={{ scrollbarWidth: 'thin' }}
                            onClick={(e) => {
                                if (!dragging) seekRecorded(clientYToMin(e.clientY));
                            }}
                        >
                            <div className="relative" style={{ height: canvasH }}>
                                {/* Activity bars */}
                                {bars.map(([s, e], i) => {
                                    const t = minToY(s) - pxPerMin / 2;
                                    const h = minToY(e) + pxPerMin / 2 - t;
                                    if (h <= 0) return null;
                                    return (
                                        <div
                                            key={i}
                                            className="absolute rounded-full bg-blue-500 opacity-70"
                                            style={{ left: 86, width: 4, top: t, height: h }}
                                        />
                                    );
                                })}

                                {/* Rows */}
                                {ALL_MINS.map((m, idx) => {
                                    const y = idx * pxPerMin;
                                    const min = m % 60;
                                    const is10 = min % 10 === 0;
                                    const isHr = min === 0;
                                    const det = detMap.get(m);
                                    const v = det ? visualForUsecase(det.usecase_name) : null;

                                    return (
                                        <div
                                            key={m}
                                            className="absolute w-full flex items-center hover:bg-blue-50/30 transition-colors"
                                            style={{ top: y, height: pxPerMin }}
                                        >
                                            <div className="flex-shrink-0 text-right select-none w-[72px] pr-1.5">
                                                {is10 && (
                                                    <span
                                                        className={`text-xs leading-none whitespace-nowrap ${
                                                            isHr ? 'font-bold text-gray-800' : 'text-gray-400'
                                                        }`}
                                                    >
                                                        {fmtMin(m)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="relative flex-shrink-0 flex items-center w-3.5">
                                                <div
                                                    className="absolute right-0 top-1/2 -translate-y-1/2"
                                                    style={{
                                                        width: is10 ? 10 : 5,
                                                        height: 1,
                                                        background: is10 ? '#9ca3af' : '#e2e8f0',
                                                    }}
                                                />
                                            </div>

                                            <div className="w-px h-full bg-gray-100 flex-shrink-0" />

                                            {det && v && (
                                                <>
                                                    <div
                                                        className={`flex-shrink-0 rounded-full z-10 -ml-1 w-2 h-2 ${v.color} border-2 border-white`}
                                                    />
                                                    <i
                                                        className={`pi ${v.icon} ${v.text} ml-2 flex-shrink-0 text-sm`}
                                                    />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openEvent(det);
                                                        }}
                                                        className="ml-auto mr-3 flex flex-col items-end gap-0.5 flex-shrink-0 hover:opacity-80"
                                                        title="Open recorded stream + AI evidence"
                                                    >
                                                        <EventThumb ev={det} />
                                                        <span className="text-[10px] text-gray-500 font-medium max-w-[7rem] truncate">
                                                            {det.usecase_name}
                                                        </span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Current-time slider */}
                                <div
                                    className="absolute inset-x-0 z-30 pointer-events-none"
                                    style={{ top: curY, transform: 'translateY(-50%)' }}
                                >
                                    <div className="absolute inset-x-0 h-0.5 top-1/2 -translate-y-1/2 bg-blue-500 shadow-sm" />
                                    <div
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setDragging(true);
                                        }}
                                        className="absolute rounded-full bg-blue-600 shadow-md pointer-events-auto transition-transform hover:scale-110"
                                        style={{
                                            left: 84,
                                            width: 14,
                                            height: 14,
                                            top: '50%',
                                            transform: 'translate(-50%,-50%)',
                                            cursor: dragging ? 'grabbing' : 'grab',
                                            zIndex: 40,
                                        }}
                                    />
                                    <div
                                        className="absolute flex items-center font-bold text-white rounded-full shadow-lg pointer-events-none"
                                        style={{
                                            left: 0,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#1e40af',
                                            fontSize: 11,
                                            padding: '4px 12px',
                                            whiteSpace: 'nowrap',
                                            borderRadius: 20,
                                        }}
                                    >
                                        {fmtMin(cur, true)}
                                    </div>
                                </div>

                                {/* Midday separator */}
                                <div
                                    className="absolute inset-x-3 flex items-center gap-2"
                                    style={{ top: minToY(720) - 20 }}
                                >
                                    <div className="flex-1 h-px bg-gray-300" />
                                    <span className="text-xs text-gray-500 font-medium bg-white px-2 whitespace-nowrap">
                                        Midday • 12:00 PM
                                    </span>
                                    <div className="flex-1 h-px bg-gray-300" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Detections list */
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {dayEvents.length === 0 && (
                                <div className="text-center text-sm text-gray-400 py-10">
                                    No detections on this day.
                                </div>
                            )}
                            {dayEvents.map((ev) => {
                                const v = visualForUsecase(ev.usecase_name);
                                return (
                                    <button
                                        key={ev.id}
                                        onClick={() => openEvent(ev)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition text-left"
                                    >
                                        <EventThumb ev={ev} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 truncate">
                                                <i className={`pi ${v.icon} ${v.text} text-xs`} />
                                                {ev.usecase_name}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(ev.event_start_time).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {' · '}
                                                {ev.location_name}
                                            </div>
                                        </div>
                                        <i className="pi pi-angle-right text-gray-300" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex-shrink-0 border-t border-gray-100 px-4 py-2 text-center text-[10px] text-gray-400">
                        Scroll for full 24-hour timeline · last {RETENTION_DAYS} days recorded
                    </div>
                </div>
            </div>
        </div>
    );
};
