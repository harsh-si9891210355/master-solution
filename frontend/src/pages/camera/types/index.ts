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