import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { Auth0Provider, AppState } from '@auth0/auth0-react';
import { AuthGate } from './components/AuthGate';
import { router } from '../src/routes/index';
import { PrimeReactProvider } from 'primereact/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../src/components/ui/ToastProvider';

// // Styles
// import '@fontsource/material-icons/index.css';
import './index.css';
// import './assets/Style/layout.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';

const queryClient = new QueryClient();

// After Auth0 returns, go to the originally-requested page (set via appState
// on loginWithRedirect), defaulting to the dashboard.
const onRedirectCallback = (appState?: AppState) => {
  // Mark this as a fresh login so AuthGate shows the success toast once
  // (and not on every page refresh / silent session restore).
  sessionStorage.setItem('auth0_fresh_login', '1');
  router.navigate(appState?.returnTo || '/dashboard', { replace: true });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        scope: 'openid profile email offline_access',
        ...(import.meta.env.VITE_AUTH0_AUDIENCE
          ? { audience: import.meta.env.VITE_AUTH0_AUDIENCE }
          : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens
      useRefreshTokensFallback
      cacheLocation="localstorage"
    >
      <PrimeReactProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthGate>
              <RouterProvider router={router} />
            </AuthGate>
          </ToastProvider>
        </QueryClientProvider>
      </PrimeReactProvider>
    </Auth0Provider>
  </React.StrictMode>
);