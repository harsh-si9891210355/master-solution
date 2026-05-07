import api from '@/lib/api';
import type { Camera, CameraFormValues } from '../types/index';

export const cameraService = {
    getCameras:      ()                                => api.get<{ cameras: Camera[] }>('/camera'),
    getCameraById:   (id: number)                      => api.get<Camera>(`/camera/${id}`),
    createCamera:    (data: CameraFormValues)          => api.post<Camera>('/camera', data),
    updateCamera:    (id: number, data: CameraFormValues) => api.put<Camera>(`/camera/${id}`, data),
    deleteCamera:    (id: number)                      => api.delete<{ message: string }>(`/camera/${id}`),
};