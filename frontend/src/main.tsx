import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from '../src/routes/index'
import { PrimeReactProvider } from 'primereact/api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Styles
import './index.css';
import 'primereact/resources/themes/lara-light-blue/theme.css'; // PrimeReact Theme
import 'primereact/resources/primereact.min.css';           // PrimeReact Core
import 'primeicons/primeicons.css';                         // Icons
import { AppProvider } from '../context/ToastContext';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrimeReactProvider>
      <AppProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AppProvider>
    </PrimeReactProvider>
  </React.StrictMode>
);