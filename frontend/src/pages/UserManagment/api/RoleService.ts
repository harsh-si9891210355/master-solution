import api from '@/lib/api';

export interface Role {
    id:   number;
    code: string;
    name: string;
}

export const roleService = {
    getRoles: () => api.get<{ roles: Role[] }>('/roles'),
};