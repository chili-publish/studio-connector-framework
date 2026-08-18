import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ToastTone = 'success' | 'error';

export type ToastMessage = {
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: ToastMessage | null;
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast((current) =>
        current?.message === message ? null : current
      );
    }, 3000);
  }, []);

  const value = useMemo(
    () => ({
      toast,
      showToast,
    }),
    [toast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
