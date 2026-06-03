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
    /** HLS manifest URL. Pass null while the parent is still fetching it. */
    hlsUrl: string | null;
    rtspUrl?: string;
    events?: CameraEvent[];
    /** Rolling DVR window in minutes — must match DVR_HOURS in dvr-worker. */
    dvrWindowMin?: number;
    /** Segment duration in seconds — must match SEGMENT_DURATION in dvr-worker. */
    segmentDurationS?: number;
}

export interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
    events?: CameraEvent[];
}