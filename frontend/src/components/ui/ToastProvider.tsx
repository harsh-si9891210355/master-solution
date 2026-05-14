import { createContext, useContext, useRef } from "react";
import { Toast } from "primereact/toast";
import type { ReactNode } from "react";
import type { ToastMessage } from "primereact/toast";


const ToastContext = createContext<React.RefObject<Toast | null> | null>(null);


export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toastRef = useRef<Toast>(null);

  return (
    <ToastContext.Provider value={toastRef}>
      <Toast ref={toastRef} position="top-right" />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ref = useContext(ToastContext);

  if (!ref) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }

  const show = (msg: ToastMessage) => ref.current?.show(msg);

  const success = (summary: string, detail?: string) =>
    show({ severity: "success", summary, detail, life: 3000 });

  const error = (summary: string, detail?: string) =>
    show({ severity: "error", summary, detail, life: 5000 });

  const warn = (summary: string, detail?: string) =>
    show({ severity: "warn", summary, detail, life: 4000 });

  const info = (summary: string, detail?: string) =>
    show({ severity: "info", summary, detail, life: 3000 });

  return { success, error, warn, info };
};