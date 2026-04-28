import api from '@/lib/api';
import { LoginFormValues, SignupFormValues } from '../types';

export const authService = {
    login: (data: LoginFormValues) => api.post('/auth/login', data),
    signup: (data: SignupFormValues) => api.post('/auth/register', data),
};