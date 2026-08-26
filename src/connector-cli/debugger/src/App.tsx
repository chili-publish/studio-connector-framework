import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/shell/AppShell';
import { AppProvider } from './core/AppContext';
import { ToastProvider } from './core/ToastContext';
import { useConnectorSettings } from './core/useConnectorSettings';
import {
  initRuntime,
  updateConnectorSettings,
} from './helpers/connectorRuntime';
import { initRuntimeErrors } from './helpers/connectorRuntime/connectorHttpError';
import { initRuntimeSleep } from './helpers/connectorRuntime/sleep';
import { ConnectorMetadata, DataModel } from './helpers/dataModel';
import { resolveSelectableModel } from './helpers/models';

const MODEL_VIEW_QUERY_PARAM = 'modelView';

function readModelViewQueryParam(): string | null {
  return new URLSearchParams(window.location.search).get(MODEL_VIEW_QUERY_PARAM);
}

function writeModelViewQueryParam(modelName: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(MODEL_VIEW_QUERY_PARAM, modelName);
  window.history.replaceState(null, '', url);
}

function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const [connector, setConnector] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

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
    return (
      <div className="dbg-state-error">
        Error: {error ?? 'Could not initialize connector'}
      </div>
    );
  }

  return (
    <DebuggerSession connector={connector} metadata={metadata} />
  );
}

function DebuggerSession({
  connector,
  metadata,
}: {
  connector: any;
  metadata: ConnectorMetadata;
}) {
  const [dataModel, setDataModel] = useState<DataModel | undefined>(() => {
    const initialModel = resolveSelectableModel(
      metadata.type,
      readModelViewQueryParam()
    );
    if (initialModel) {
      writeModelViewQueryParam(initialModel.name);
    }
    return initialModel;
  });
  const {
    globalHeaders,
    runtimeOptions,
    authorization,
    globalQueryParams,
    updateSettings,
  } = useConnectorSettings(metadata.name);

  const handleModelChanged = useCallback((model: DataModel) => {
    setDataModel(model);
    writeModelViewQueryParam(model.name);
  }, []);

  useEffect(() => {
    updateConnectorSettings({
      httpParams: {
        authorization,
        globalHeaders,
        globalQueryParams,
      },
      runtimeOptions,
    });
  }, [globalHeaders, runtimeOptions, authorization, globalQueryParams]);

  return (
    <ToastProvider>
      <AppProvider
        connector={connector}
        metadata={metadata}
        globalHeaders={globalHeaders}
        authorization={authorization}
        runtimeOptions={runtimeOptions}
        globalQueryParams={globalQueryParams}
        updateSettings={updateSettings}
      >
        <AppShell dataModel={dataModel} onModelChanged={handleModelChanged} />
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
