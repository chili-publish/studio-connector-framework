import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Header } from '../helpers/connectorRuntime';
import type { ConnectorMetadata } from '../helpers/dataModel';
import type { UpdateSettingsFn } from './connectorSettingsStorage';

export type ToastTone = 'success' | 'error';

export type ToastMessage = {
  message: string;
  tone: ToastTone;
};

type AppContextValue = {
  connector: any;
  metadata: ConnectorMetadata;
  globalHeaders: Header[];
  authorization: string;
  runtimeOptions: Record<string, unknown>;
  globalQueryParams: URLSearchParams;
  updateSettings: UpdateSettingsFn;
  toast: ToastMessage | null;
  showToast: (message: string, tone?: ToastTone) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  connector,
  metadata,
  globalHeaders,
  authorization,
  runtimeOptions,
  globalQueryParams,
  updateSettings,
  children,
}: {
  connector: any;
  metadata: ConnectorMetadata;
  globalHeaders: Header[];
  authorization: string;
  runtimeOptions: Record<string, unknown>;
  globalQueryParams: URLSearchParams;
  updateSettings: UpdateSettingsFn;
  children: ReactNode;
}) {
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
      connector,
      metadata,
      globalHeaders,
      authorization,
      runtimeOptions,
      globalQueryParams,
      updateSettings,
      toast,
      showToast,
    }),
    [
      connector,
      metadata,
      globalHeaders,
      authorization,
      runtimeOptions,
      globalQueryParams,
      updateSettings,
      toast,
      showToast,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
