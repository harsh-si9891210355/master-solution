import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export interface CameraFrameApiResponse {
  code: number;
  message: string;
  frameFile: string | Blob | null;
}

export interface CameraDetailsApiResponse {
  code: number;
  message: string;
  cameraDetails?: {
    id: number;
    name: string;
    roi?: any;
    usecases?: Array<{ usecaseId: number; usecaseName: string }>;
  };
}

export interface RoiGetApiResponse {
  code: number;
  message: string;
  roi: any | null;
}

export interface UpdateRoiRequest {
  cameraId: number;
  roi: any[];
}

export interface UpdateRoiResponse {
  code: number;
  message: string;
}

export const getAuthToken = (): string | null => {
  return useAuthStore.getState().token;
};

export const getCameraDetails = async (cameraId: number): Promise<CameraDetailsApiResponse> => {
  try {
    const response = await api.get(`/camera/${cameraId}`);
    const data = response.data;
    return {
      code: 200,
      message: 'OK',
      cameraDetails: {
        id: data.id ?? cameraId,
        name: data.name ?? `Camera ${cameraId}`,
        roi: data.roi ?? null,
        usecases: data.usecases ?? [],
      },
    };
  } catch (error: any) {
    return {
      code: error?.response?.status ?? 500,
      message: error?.message ?? 'Failed to fetch camera details',
    };
  }
};

export const getCameraRoi = async (cameraId: number): Promise<RoiGetApiResponse> => {
  try {
    const response = await api.get(`/roi/getroi`, { params: { cameraId } });
    const data = response.data;
    return {
      code: 200,
      message: data?.message ?? 'OK',
      roi: data?.roi ?? null,
    };
  } catch (error: any) {
    return {
      code: error?.response?.status ?? 500,
      message: error?.message ?? 'Failed to fetch ROI',
      roi: null,
    };
  }
};

export const getCameraFrame = async (cameraId: number): Promise<CameraFrameApiResponse> => {
  try {
    const response = await api.get(`/roi/${cameraId}/frame`);
    const data = response.data;
    return {
      code: 200,
      message: 'OK',
      frameFile: data.frameFile ?? data.frame ?? null,
    };
  } catch (error: any) {
    return {
      code: error?.response?.status ?? 500,
      message: error?.message ?? 'Failed to fetch camera frame',
      frameFile: null,
    };
  }
};

export const refreshCameraFrame = async (cameraId: number): Promise<CameraFrameApiResponse> => {
  try {
    const response = await api.post(`/roi/${cameraId}/frame/refresh`);
    const data = response.data;
    return {
      code: 200,
      message: 'OK',
      frameFile: data.frameFile ?? data.frame ?? null,
    };
  } catch (error: any) {
    return {
      code: error?.response?.status ?? 500,
      message: error?.message ?? 'Failed to refresh camera frame',
      frameFile: null,
    };
  }
};

export const updateRoi = async (payload: UpdateRoiRequest): Promise<UpdateRoiResponse> => {
  try {
    const response = await api.put(`/roi/updateroi`, payload);
    return {
      code: 200,
      message: response.data?.message ?? 'ROI saved successfully',
    };
  } catch (error: any) {
    return {
      code: error?.response?.status ?? 500,
      message: error?.message ?? 'Failed to save ROI',
    };
  }
};
