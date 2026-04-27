import React, { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

const ToastContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
    const toast = useRef<Toast>(null);

    const showToast = (severity: 'success' | 'error' | 'info', summary: string, detail: string) => {
        toast.current?.show({ severity, summary, detail, life: 3000 });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {/* The Toast component itself is invisible until called */}
            <Toast ref={toast} />
            {/* CRITICAL: Without this line, your app is blank */}
            {children}
        </ToastContext.Provider>
    );
};

export const useAppToast = () => useContext(ToastContext);