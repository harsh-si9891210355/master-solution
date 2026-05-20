import api from '@/lib/api';
import type { Usecase, UsecaseFormValues } from '../types/index';

export const usecaseService = {

    // GET /api/v1/usecase  →  { usecases: Usecase[] }
    getUsecases: () =>
        api.get<{ usecases: Usecase[] }>('/usecase'),

    // GET /api/v1/usecase/:id  →  Usecase
    getUsecaseById: (id: number) =>
        api.get<Usecase>(`/usecase/${id}`),

    // POST /api/v1/usecase        → create (no id)
    // POST /api/v1/usecase/:id    → update (with id)
    saveUsecase: (data: UsecaseFormValues, id?: number) =>
        id
            ? api.post<Usecase>(`/usecase/${id}`, data)
            : api.post<Usecase>('/usecase', data),

    // PATCH /api/v1/usecase/:id/status
    updateStatus: (id: number, status: boolean) =>
        api.patch<Usecase>(`/usecase/${id}/status`, { status }),

    // DELETE /api/v1/usecase/:id
    deleteUsecase: (id: number) =>
        api.delete<{ message: string }>(`/usecase/${id}`),
};