import api from '@/lib/api'; 

export const userService = {
    getUsers: ()                        => api.get('/user'),
    getUserById: (id: number)           => api.get(`/user/${id}`),
    createUser: (data: any)             => api.post('/user', data),
    updateUser: (id: number, data: any) => api.put(`/user/${id}`, data),
    deleteUser: (id: number) => api.delete(`/user/${id}`),
};