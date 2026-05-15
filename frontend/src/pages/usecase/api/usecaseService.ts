import api from '@/lib/api';

export interface Usecase {
    id: number;
    code: string;
    name: string;
    description: string | null;
    status: boolean;
}

export const usecaseService = {
    getUsecases: () => api.get<{ usecases: Usecase[] }>('/usecase'),
};
