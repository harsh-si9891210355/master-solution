import api from '@/lib/api';
import { LoginFormValues, SignupFormValues } from '../types';

export const authService = {
    login:          (data: LoginFormValues)  => api.post('/auth/login', data),
    signup:         (data: SignupFormValues) => api.post('/auth/signup', data),
    // Exchange an Auth0 access token for the local user + permissions.
    session:        (accessToken: string) =>
                        api.post('/auth/session', null, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        }),
    // Self-service profile edit for the signed-in user.
    // Backend contract: PATCH /auth/me → returns the updated user.
    updateMyProfile: (data: {
                        first_name: string;
                        last_name: string;
                        mobile_number?: string;
                        department?: string;
                        city?: string;
                        state?: string;
                        country?: string;
                    }) => api.patch('/auth/me', data),
    forgotPassword: (email: string)          => api.post('/auth/forgot-password', { email }),
    setPassword:    (token: string, password: string) =>
                        api.post('/auth/set-password', { token, password }),
    resetPassword:  (reset_token: string, new_password: string) =>
                        api.post('/auth/reset-password', { reset_token, new_password }),
};