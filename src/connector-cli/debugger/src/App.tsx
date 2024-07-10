import { useEffect, useState } from 'react';
import './App.css';
import { MainContent } from './Components/MainContent';
import { Sidebar } from './Components/Sidebar';
import { Header, initRuntime } from './Helpers/ConnectorRuntime';
import { DataModel } from './Helpers/DataModel';
import { Models } from './Helpers/Models';

const httpHeadersStorageKey = 'connector-cli-http-headers';
const runtimeSettingsStorageKey = 'connector-cli-runtime-settings';

function App() {
  const [dataModel, setDataModel] = useState<DataModel | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(true);
  const [connector, setConnector] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  const [globalHeaders, setGlobalHeaders] = useState<Header[]>([]);
  const [authorization, setAuthorization] = useState<Header>({} as any);
  const [runtimeOptions, setRuntimeOptions] = useState<Record<string, unknown>>(
    {}
  );

  useEffect(() => {
    initRuntime(globalHeaders, runtimeOptions, authorization)
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
  }, [globalHeaders, runtimeOptions, authorization]);

  useEffect(() => {
    Models.updateConfiguration = (
      name: 'headers' | 'options',
      value: unknown
    ) => {
      switch (name) {
        case 'headers':
          const val: { authorization: Header; other: Header[] } = value as {
            authorization: Header;
            other: Header[];
          };
          setAuthorization(val.authorization);
          setGlobalHeaders(val.other);

          sessionStorage.setItem(httpHeadersStorageKey, JSON.stringify(val));
          break;
        case 'options': {
          setRuntimeOptions(value as Record<string, unknown>);
          sessionStorage.setItem(
            runtimeSettingsStorageKey,
            JSON.stringify(value)
          );
        }
      }
    };

    // Read saved configuration from session storage
    if (!!sessionStorage.getItem(runtimeSettingsStorageKey)) {
      Models.updateConfiguration(
        'options',
        JSON.parse(sessionStorage.getItem(runtimeSettingsStorageKey)!)
      );
    }
    if (!!sessionStorage.getItem(httpHeadersStorageKey)) {
      Models.updateConfiguration(
        'headers',
        JSON.parse(sessionStorage.getItem(httpHeadersStorageKey)!)
      );
    }
  }, []);

  function onModelChanged(model: DataModel): void {
    // TODO: Implement better way of propagation stored values to the component params
    if (
      model.name === 'Runtime options' &&
      Object.keys(runtimeOptions).length !== 0
    ) {
      model.parameters[0].value = runtimeOptions;
    }
    if (
      model.name === 'headers' &&
      (authorization.name || authorization.value)
    ) {
      model.parameters[0].value = { [authorization.name]: authorization.value };
    }
    if (model.name === 'headers' && Object.keys(globalHeaders).length !== 0) {
      model.parameters[1].value = globalHeaders.reduce(
        (val, gh) => {
          val[gh.name] = gh.value;
          return val;
        },
        {} as Record<string, string>
      );
    }
    setDataModel(model);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  Models.ConnectorMetadata = {
    name: connector.constructor.name,
    type:
      new URLSearchParams(window.location.search).get('type') ??
      'FontConnector',
    getDisplayType: function () {
      switch (this.type) {
        case 'MediaConnector':
          return 'Media Connector';
        case 'FontConnector':
          return 'Font Connector';
        case 'DataConnector':
          return 'Data Connector';
        default:
          return 'Media Connector';
      }
    },
  };

  return (
    <div className="h-screen flex">
      <Sidebar onModelChanged={onModelChanged} />
      <MainContent dataModel={dataModel} />
    </div>
  );
}

export default App;
