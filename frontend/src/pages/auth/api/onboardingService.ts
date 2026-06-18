import api from '@/lib/api';

export interface FirstTimeLoginPayload {
    email: string;
    temporary_password: string;
    new_password: string;
    confirm_password: string;
}

export interface CompleteProfilePayload {
    token: string;
    first_name: string;
    last_name: string;
    department?: string;
    country_code?: string;
    mobile_number?: string;
    city?: string;
    state?: string;
    country?: string;
}

export const onboardingService = {
    // Admin invite (needs user:create). Creates the user with a temp password,
    // is_active=false, and emails the temp password + first-time-login link.
    invite: (data: { email: string; role_code?: string }) =>
        api.post('/onboarding/invite', data),

    // Step 1 — verify temp password, set the new password, get a short-lived token.
    firstTimeLogin: (data: FirstTimeLoginPayload) =>
        api.post('/onboarding/first-time-login', data),

    // Step 2 — save profile and activate the account (token from step 1).
    completeProfile: (data: CompleteProfilePayload) =>
        api.post('/onboarding/complete-profile', data),
};
