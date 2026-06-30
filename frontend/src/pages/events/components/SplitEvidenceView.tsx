import { NvrPlayer } from './NvrPlayer';
import type { StreamInfo } from '../../camera/api/cameraService';
import type { Event } from '../types/index';

interface SplitEvidenceViewProps {
    event: Event;
    cameraId: number;
    cameraName: string;
    streamInfo: StreamInfo | null;
    onBack: () => void;
}

const formatTime = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
        ? '—'
        : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'medium' });
};

/**
 * Two panes for a past event:
 *   • Left  — the continuous recorded/DVR stream seeked to the event start
 *             (NVR footage, with the full DVR control bar).
 *   • Right — the AI-annotated evidence video produced by the Event Manager.
 */
export const SplitEvidenceView = ({
    event,
    cameraId,
    cameraName,
    streamInfo,
    onBack,
}: SplitEvidenceViewProps) => {
    const eventStartMs = new Date(event.event_start_time).getTime();

    return (
        <div className="flex flex-col h-full bg-black min-h-0">
            {/* Header: event context + back-to-live */}
            <div className="flex items-center justify-between gap-3 px-4 h-12 bg-white border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-md transition"
                    >
                        <i className="pi pi-arrow-left text-xs" />
                        Back to live
                    </button>
                    <div className="w-px h-6 bg-gray-200" />
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">
                            {event.usecase_name}
                            <span className="ml-2 text-xs font-normal text-gray-400">#{event.id}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {event.camera_name} · {formatTime(event.event_start_time)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Two panes */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2 p-2 bg-black overflow-auto">
                {/* Recorded / DVR stream */}
                <div className="flex flex-col min-h-0 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-900 text-xs font-semibold text-white/80">
                        <i className="pi pi-server text-[11px]" />
                        Recorded stream (NVR)
                    </div>
                    <div className="flex-1 min-h-[14rem]">
                        <NvrPlayer
                            cameraId={cameraId}
                            cameraName={cameraName}
                            liveWebrtcUrl={streamInfo?.live_webrtc_url ?? null}
                            playbackGetBaseUrl={streamInfo?.playback_get_base_url ?? null}
                            streamConfig={streamInfo?.stream_config ?? null}
                            initialSeekMs={eventStartMs}
                            compact
                        />
                    </div>
                </div>

                {/* AI evidence video */}
                <div className="flex flex-col min-h-0 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-900 text-xs font-semibold text-white/80">
                        <i className="pi pi-bolt text-[11px]" />
                        AI detected event (evidence)
                    </div>
                    <div className="flex-1 min-h-[14rem] flex items-center justify-center bg-black">
                        {event.evidence_url ? (
                            <video
                                key={event.evidence_url}
                                src={event.evidence_url}
                                controls
                                playsInline
                                autoPlay
                                muted
                                className="w-full h-full object-contain bg-black"
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                                <i className="pi pi-video text-2xl" />
                                <span className="text-xs">No evidence video for this event</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
