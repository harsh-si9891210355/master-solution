import api from '@/lib/api';

export const userService = {
    getUsers: () => api.get('/user'),
    getUserById: (id: number) => api.get(`/user/${id}`),
    // Admin invite: creates the user with a temp password (is_active=false) and
    // emails them the temp password + first-time-login link.
    createUser: (data: any) => api.post('/onboarding/invite', data),
    updateUser: (id: number, data: any) => api.post('/user', { ...data, id }),
    updateUserStatus: (id: number, is_active: boolean) =>
        api.patch(`/user/${id}/status`, { is_active }),
    deleteUser: (id: number) => api.delete(`/user/${id}`),
};