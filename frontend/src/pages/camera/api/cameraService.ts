import api from '@/lib/api';
import type { Camera, CameraFormValues, UpdateCameraUseCaseRequest } from '../types/index';

export interface StreamInfo {
    camera_id:      number;
    stream_path:    string;
    webrtc_url:     string;
    hls_url:        string;
    mediamtx_ready: boolean;
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
};