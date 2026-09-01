import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { Header } from '../helpers/connectorRuntime';
import type { ConnectorMetadata } from '../helpers/dataModel';
import type { UpdateSettingsFn } from './connectorSettingsStorage';

type AppContextValue = {
  connector: any;
  metadata: ConnectorMetadata;
  globalHeaders: Header[];
  authorization: string;
  runtimeOptions: Record<string, unknown>;
  globalQueryParams: URLSearchParams;
  updateSettings: UpdateSettingsFn;
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
  const value = useMemo(
    () => ({
      connector,
      metadata,
      globalHeaders,
      authorization,
      runtimeOptions,
      globalQueryParams,
      updateSettings,
    }),
    [
      connector,
      metadata,
      globalHeaders,
      authorization,
      runtimeOptions,
      globalQueryParams,
      updateSettings,
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
