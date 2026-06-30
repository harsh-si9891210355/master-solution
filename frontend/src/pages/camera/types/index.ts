import type { StreamConfig } from '../api/cameraService';

export interface CameraUsecase {
    usecase_id: number;
    is_active:  boolean;
}

export interface Camera {
    id:                 number;
    name_en:            string;
    name_es:            string | null;
    name_fr:            string | null;
    name:               string;       
    location_id:        number;
    location_name:      string;
    codec:              string;
    resolution:         string;
    height:             number;
    fps:                string;
    rtsp_url:           string | null;
    substream_rtsp_url: string | null;
    status:             boolean;
    status_modified_by: number;
    usecases:           CameraUsecase[];
    last_modified_at:   string | null;
    created_at:         string;
}

export interface CameraFormValues {
    name_en:            string;
    name_es:            string | null;
    name_fr:            string | null;
    location_id:        number | null;
    codec:              string;
    resolution:         string;
    height:             number;
    fps:                string;
    rtsp_url:           string | null;
    substream_rtsp_url: string | null;
    status:             boolean;
    status_modified_by: number;
    usecases:           CameraUsecase[];
}

export interface UpdateCameraUseCaseRequest {
    usecases: CameraUsecase[];
}

export interface CameraEvent {
    id: string | number;
    timestamp: Date;
    type: string;
    label: string;
    icon: string;   // PrimeIcons class, e.g. 'pi-eye'
    color: string;  // Tailwind bg-* class, e.g. 'bg-purple-500'
}

export interface DVRPlayerProps {
    cameraId?: number;
    liveWebrtcUrl: string | null;
    playbackGetBaseUrl?: string | null;
    rtspUrl?: string;
    events?: CameraEvent[];
    streamConfig?: StreamConfig | null;
    /**
     * When set, the player skips the initial live connection and opens directly
     * in DVR playback seeked to this wall-clock timestamp (ms). Used by the Event
     * Information timeline to show the recorded stream for a past event.
     */
    initialSeekMs?: number | null;
}

export interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
    events?: CameraEvent[];
}
