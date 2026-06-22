// Bridges the Auth0 SDK's getAccessTokenSilently — which is only available via
// the useAuth0() hook inside React — to the axios interceptor, which runs
// outside React. A component registers the getter; the interceptor calls it.

type TokenGetter = () => Promise<string>;

let tokenGetter: TokenGetter | null = null;

export const setAccessTokenGetter = (fn: TokenGetter | null) => {
    tokenGetter = fn;
};

/**
 * Returns a fresh Auth0 access token (the SDK auto-refreshes it when near
 * expiry), or null when the user isn't authenticated via Auth0 / refresh fails.
 */
export const getFreshAccessToken = async (): Promise<string | null> => {
    if (!tokenGetter) return null;
    try {
        return await tokenGetter();
    } catch {
        return null;
    }
};

// Re-authentication handler — registered by AuthGate only while the user is
// authenticated via Auth0. Lets the axios interceptor trigger a fresh Auth0
// login on a 401 instead of a hard logout. Returns true if a handler ran.
type ReauthHandler = () => void;

let reauthHandler: ReauthHandler | null = null;

export const setReauthHandler = (fn: ReauthHandler | null) => {
    reauthHandler = fn;
};

export const triggerReauth = (): boolean => {
    if (!reauthHandler) return false;
    reauthHandler();
    return true;
};
