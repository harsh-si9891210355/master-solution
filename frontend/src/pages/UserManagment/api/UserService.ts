import api from '@/lib/api';

export const userService = {
    getUsers: () => api.get('/user'),
    getUserById: (id: number) => api.get(`/user/${id}`),
    createUser: (data: any) => api.post('/user', data),
    updateUser: (id: number, data: any) => api.post('/user', { ...data, id }),
    updateUserStatus: (id: number, is_active: boolean) =>
        api.patch(`/user/${id}/status`, { is_active }),
    deleteUser: (id: number) => api.delete(`/user/${id}`),
};