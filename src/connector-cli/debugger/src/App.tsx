import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { MainContent } from './Components/MainContent';
import { Sidebar } from './Components/Sidebar';
import { initRuntime } from './Helpers/ConnectorRuntime';
import { ComplexParameter, DataModel } from './Helpers/DataModel';
import { Models } from './Helpers/Models';
import { useConnectorSettings } from './core/useConnectorSettings';

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
    initSettings,
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
    initRuntime(globalHeaders, runtimeOptions, authorization, globalQueryParams)
      .then((connector) => {
        Models.ConnectorInstance = connector;
        setConnector(connector);
        setLoading(false);
        console.log('connector', connector);
      })
      .catch((err) => {
        setError('Could not fetch connector');
        setLoading(false);
        console.error('error', err);
      });
  }, [globalHeaders, runtimeOptions, authorization, globalQueryParams]);

  useEffect(() => {
    Models.updateSettings = updateSettings;
    initSettings();
  }, [updateSettings, initSettings]);

  const modelChangeHandler = (model: DataModel) => {
    console.debug('Model "Change"', model);
    // TODO: Implement better way of propagation stored values to the component params
    if (
      model.name === 'Runtime options' &&
      Object.keys(runtimeOptions).length !== 0
    ) {
      model.parameters[0].value = runtimeOptions;
    }
    if (
      model.name === 'http-params' &&
      (authorization.name || authorization.value)
    ) {
      (model.parameters[0] as ComplexParameter).complex[0].value = {
        [authorization.name]: authorization.value,
      };
    }
    if (
      model.name === 'http-params' &&
      Object.keys(globalHeaders).length !== 0
    ) {
      (model.parameters[0] as ComplexParameter).complex[1].value =
        globalHeaders.reduce(
          (val, gh) => {
            val[gh.name] = gh.value;
            return val;
          },
          {} as Record<string, string>
        );
    }

    if (model.name === 'http-params' && globalQueryParams.size !== 0) {
      model.parameters[1].value = Array.from(
        globalQueryParams.entries()
      ).reduce(
        (val, gqp) => {
          val[gqp[0]] = gqp[1];
          return val;
        },
        {} as Record<string, string>
      );
    }
    setDataModel(model);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  Models.ConnectorMetadata = {
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

  return (
    <div className="h-screen flex">
      <Sidebar onModelChanged={modelChangeHandler} />
      <MainContent dataModel={dataModel} />
    </div>
  );
}

export default App;
