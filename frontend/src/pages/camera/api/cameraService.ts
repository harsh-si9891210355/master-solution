import api from '@/lib/api';
import type { Camera, CameraFormValues, UpdateCameraUseCaseRequest } from '../types/index';

export interface StreamConfig {
    recording_poll_interval_ms: number;
    live_edge_threshold_s: number;
    playback_format: string;
    playback_padding_before_s: number;
    playback_padding_after_s: number;
    playback_min_duration_s: number;
    playback_max_duration_s: number;
}

export interface StreamInfo {
    camera_id:             number;
    stream_path:           string;
    live_webrtc_url:       string;
    playback_get_base_url: string;
    mediamtx_ready:        boolean;
    stream_config:         StreamConfig;
}

export interface RecordingSpan {
    start: string;
    end: string;
    duration: number;
    // Path this span was recorded on, and the playback URL for it. Present so the
    // timeline can merge the transcoded (-rec) and legacy full-res recordings and
    // play each span from the correct path.
    path?: string;
    playback_get_base_url?: string;
}

export interface RecordingSpansResponse {
    camera_id:             number;
    stream_path:           string;
    playback_get_base_url: string;
    spans:                 RecordingSpan[];
    stream_config:         StreamConfig;
}

export const cameraService = {
    getCameras:      ()                                => api.get<{ cameras: Camera[] }>('/camera'),
    getCameraById:   (id: number)                      => api.get<Camera>(`/camera/${id}`),
    createCamera:    (data: CameraFormValues)          => api.post<Camera>('/camera', data),
    updateCamera:    (id: number, data: CameraFormValues) => api.post<Camera>(`/camera/${id}`, data),
    deleteCamera:    (id: number)                      => api.delete<{ message: string }>(`/camera/${id}`),
    updateStatus:    (id: number, status: boolean)     => api.patch<{ message: string }>(`/camera/${id}/status`, { status }),
    updateCameraUseCase: (id: number, data: UpdateCameraUseCaseRequest) => api.post<Camera>(`/camera/${id}/update_camera_usecase`, data),
    getStreamInfo:   (id: number)                      => api.get<StreamInfo>(`/stream/${id}`),
    getRecordingSpans: (id: number)                    => api.get<RecordingSpansResponse>(`/stream/${id}/recordings`),
};
