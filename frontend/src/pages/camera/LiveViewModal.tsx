import { useEffect, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import type { CameraEvent, LiveViewModalProps } from './types/index';
import { cameraService, type StreamInfo } from './api/cameraService';
import { DVRPlayer } from './DVRPlayer';


const DEMO_EVENTS: CameraEvent[] = [
    { id: 1, timestamp: new Date(Date.now() - 100 * 60 * 1000), type: 'motion', label: 'Motion detected',  icon: 'pi-eye',                  color: 'bg-purple-500' },
    { id: 2, timestamp: new Date(Date.now() -  75 * 60 * 1000), type: 'person', label: 'Person detected',  icon: 'pi-user',                 color: 'bg-blue-500'   },
    { id: 3, timestamp: new Date(Date.now() -  50 * 60 * 1000), type: 'alert',  label: 'Alert triggered',  icon: 'pi-exclamation-triangle', color: 'bg-red-500'    },
    { id: 4, timestamp: new Date(Date.now() -  20 * 60 * 1000), type: 'person', label: 'Person detected',  icon: 'pi-user',                 color: 'bg-blue-500'   },
    { id: 5, timestamp: new Date(Date.now() -   8 * 60 * 1000), type: 'motion', label: 'Motion detected',  icon: 'pi-eye',                  color: 'bg-purple-500' },
];

export const LiveViewModal = ({
    camera,
    visible,
    onHide,
    events = DEMO_EVENTS,
}: LiveViewModalProps) => {
    const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible || !camera) {
            setStreamInfo(null);
            setFetchError(null);
            return;
        }

        setStreamInfo(null);
        setFetchError(null);

        cameraService
            .getStreamInfo(camera.id)
            .then(({ data }) => setStreamInfo(data))
            .catch(() => setFetchError('Failed to fetch stream info'));
    }, [visible, camera?.id]);

    const retryFetch = () => {
        if (!camera) return;

        setFetchError(null);
        setStreamInfo(null);

        cameraService
            .getStreamInfo(camera.id)
            .then(({ data }) => setStreamInfo(data))
            .catch(() => setFetchError('Failed to fetch stream info'));
    };

    return (
        <Dialog
            visible={visible}
            onHide={onHide}
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
            style={{ width: 'min(95vw, 80rem)' }}
            modal
            closable
            className="live-view-dialog"
        >
            {fetchError ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <i className="pi pi-exclamation-triangle text-3xl text-red-400" />

                    <span className="text-sm text-red-500">
                        {fetchError}
                    </span>

                    <button
                        onClick={retryFetch}
                        className="px-4 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
                    >
                        Retry
                    </button>
                </div>
            ) : (
                <DVRPlayer
                    cameraId={camera?.id}
                    liveWebrtcUrl={streamInfo?.live_webrtc_url ?? null}
                    playbackGetBaseUrl={streamInfo?.playback_get_base_url ?? null}
                    rtspUrl={camera?.rtsp_url ?? undefined}
                    events={events}
                    streamConfig={streamInfo?.stream_config ?? null}
                />
            )}
        </Dialog>
    );
};