import type { StreamConfig } from '../api/cameraService';

export interface CameraUsecase {
    usecase_id: number;
    is_active: boolean;
}

export interface Camera {
    identity: {
        id: number;
        code: string | null;
        displayName: string;
        en: string;
        es: string;
        fr: string;
        tags: string[] | null;
    };
    location: {
        siteId: number | null;
        locationId: number;
        zoneId: number | null;
        zoneType: string | null;
        locationName: string;
    };
    connectivity: {
        protocol: string | null;
        ipAddress: string | null;
        port: number | null;
        credentials: string | null;
        isOnline: boolean | null;
        lastHeartbeatAt: string | null;
        rtspUrl: string;
        substreamRtspUrl: string | null;
    };
    video: {
        codec: string;
        nativeResolution: string;
        nativeFps: number;
        height: number;
        streams: unknown | null;
    };
    ai: {
        enabled: boolean | null;
        processingMode: string | null;
        useCases: unknown | null;
        regionsOfInterest: unknown | null;
        schedules: unknown | null;
    };
    recording: {
        enabled: boolean | null;
        retentionDays: number | null;
        storageTier: string | null;
    };
    alerts: {
        enabled: boolean | null;
        rules: unknown | null;
    };
    capabilities: {
        isPTZ: boolean | null;
        supportsEdgeAI: boolean | null;
        supportsAudio: boolean | null;
    };
    status: {
        active: boolean;
        createdAt: string;
        createdBy: number;
        updatedAt: string;
        updatedBy: number | null;
    };
}

export interface CamerasResponse {
    cameras: Camera[];
}

export interface CameraFormValues {
    // Identity
    name_en: string;
    name_es: string | null;
    name_fr: string | null;

    // Location
    location_id: number | null;

    // Connectivity
    rtsp_url: string | null;
    substream_rtsp_url: string | null;
    protocol: string | null;
    ip_address: string | null;
    port: number | null;

    // Video
    codec: string;
    resolution: string;
    fps: string;
    height: number;

    // AI
    ai_enabled: boolean;
    processing_mode: string | null;

    // Recording
    recording_enabled: boolean;
    retention_days: number | null;
    storage_tier: string | null;

    // Capabilities
    is_ptz: boolean;
    supports_edge_ai: boolean;
    supports_audio: boolean;

    // Alerts
    alerts_enabled: boolean;

    // Meta
    status: boolean;
    status_modified_by?: number;
    usecases: CameraUsecase[];
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
}

export interface LiveViewModalProps {
    camera: Camera | null;
    visible: boolean;
    onHide: () => void;
    events?: CameraEvent[];
}
