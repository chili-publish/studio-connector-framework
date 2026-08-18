import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { MainContent } from './Components/MainContent';
import { Sidebar } from './Components/Sidebar';
import { DebuggerProvider, useDebugger } from './core/DebuggerContext';
import { useConnectorSettings } from './core/useConnectorSettings';
import {
  initRuntime,
  updateRuntimeConfig,
} from './Helpers/ConnectorRuntime';
import { initRuntimeErrors } from './Helpers/ConnectorRuntime/ConnectorHttpError';
import { initRuntimeSleep } from './Helpers/ConnectorRuntime/sleep';
import { ConnectorMetadata, DataModel } from './Helpers/DataModel';

function DebuggerToast() {
  const { toast } = useDebugger();
  if (!toast) {
    return null;
  }

  const toneClass =
    toast.tone === 'error' ? 'dbg-badge-error' : 'dbg-badge-success';

  return (
    <div className="dbg-toast-region" role="status">
      <div className={`dbg-toast ${toneClass}`}>{toast.message}</div>
    </div>
  );
}

function DebuggerShell({
  dataModel,
  onModelChanged,
}: {
  dataModel: DataModel | undefined;
  onModelChanged: (model: DataModel) => void;
}) {
  return (
    <div className="dbg-app">
      <Sidebar
        onModelChanged={onModelChanged}
        activeModelName={dataModel?.name}
      />
      <MainContent key={dataModel?.name} dataModel={dataModel} />
      <DebuggerToast />
    </div>
  );
}

function App() {
  const [dataModel, setDataModel] = useState<DataModel | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [connector, setConnector] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const {
    globalHeaders,
    runtimeOptions,
    authorization,
    globalQueryParams,
    updateSettings,
  } = useConnectorSettings();

  const connectorType = useMemo(() => {
    const queryParamConnectorType = new URLSearchParams(window.location.search)
      .get('type')
      ?.toLowerCase();

    if (
      queryParamConnectorType !== 'mediaconnector' &&
      queryParamConnectorType !== 'dataconnector' &&
      queryParamConnectorType !== 'fontconnector'
    ) {
      return 'mediaconnector';
    }
    return queryParamConnectorType;
  }, []);

  useEffect(() => {
    updateRuntimeConfig({
      globalHeaders,
      runtimeOptions,
      authorization,
      globalQueryParams,
    });
  }, [globalHeaders, runtimeOptions, authorization, globalQueryParams]);

  useEffect(() => {
    initRuntimeErrors();
    initRuntimeSleep();
    initRuntime()
      .then((loadedConnector) => {
        setConnector(loadedConnector);
        setLoading(false);
        console.log('connector', loadedConnector);
      })
      .catch((err) => {
        setError('Could not fetch connector');
        setLoading(false);
        console.error('error', err);
      });
  }, []);

  const metadata: ConnectorMetadata | null = useMemo(() => {
    if (!connector) {
      return null;
    }

    return {
      name: connector.constructor.name,
      type: connectorType,
      getDisplayType: function () {
        switch (this.type) {
          case 'mediaconnector':
            return 'Media Connector';
          case 'fontconnector':
            return 'Font Connector';
          case 'dataconnector':
            return 'Data Connector';
        }
      },
    };
  }, [connector, connectorType]);

  if (loading) {
    return <div className="dbg-state-loading">Loading...</div>;
  }

  if (error || !connector || !metadata) {
    return <div className="dbg-state-error">Error: {error}</div>;
  }

  return (
    <DebuggerProvider
      connector={connector}
      metadata={metadata}
      globalHeaders={globalHeaders}
      authorization={authorization}
      runtimeOptions={runtimeOptions}
      globalQueryParams={globalQueryParams}
      updateSettings={updateSettings}
    >
      <DebuggerShell dataModel={dataModel} onModelChanged={setDataModel} />
    </DebuggerProvider>
  );
}

export default App;
