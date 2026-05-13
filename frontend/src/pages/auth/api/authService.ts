import api from '@/lib/api';
import { LoginFormValues, SignupFormValues } from '../types';

export const authService = {
    login:          (data: LoginFormValues)  => api.post('/auth/login', data),
    signup:         (data: SignupFormValues) => api.post('/auth/signup', data),
    forgotPassword: (email: string)          => api.post('/auth/forgot-password', { email }),
    setPassword:    (token: string, password: string) =>
                        api.post('/auth/set-password', { token, password }),
};