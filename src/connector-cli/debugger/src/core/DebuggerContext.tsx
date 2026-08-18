import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Header } from '../Helpers/ConnectorRuntime';
import type { ConnectorMetadata } from '../Helpers/DataModel';
import type { UpdateSettingsFn } from './useConnectorSettings';

export type ToastTone = 'success' | 'error';

export type DebuggerToast = {
  message: string;
  tone: ToastTone;
};

type DebuggerContextValue = {
  connector: any;
  metadata: ConnectorMetadata;
  globalHeaders: Header[];
  authorization: string;
  runtimeOptions: Record<string, unknown>;
  globalQueryParams: URLSearchParams;
  updateSettings: UpdateSettingsFn;
  toast: DebuggerToast | null;
  showToast: (message: string, tone?: ToastTone) => void;
};

const DebuggerContext = createContext<DebuggerContextValue | null>(null);

export function DebuggerProvider({
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
  const [toast, setToast] = useState<DebuggerToast | null>(null);

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

  return (
    <DebuggerContext.Provider value={value}>
      {children}
    </DebuggerContext.Provider>
  );
}

export function useDebugger() {
  const context = useContext(DebuggerContext);
  if (!context) {
    throw new Error('useDebugger must be used within DebuggerProvider');
  }
  return context;
}
