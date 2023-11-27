import { useState } from 'react';
import './App.css';
import { DataModel } from './Helpers/DataModel';
import { initRuntime } from './Helpers/ConnectorRuntime';
// import react
import { useEffect } from 'react';
import { Models } from './Helpers/Models';
import { MainContent } from './Components/MainContent';
import { Sidebar } from './Components/Sidebar';

function App() {
  const [dataModel, setDataModel] = useState<DataModel | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(true);
  const [connector, setConnector] = useState<any>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    initRuntime([])
      .then((connector) => {
        Models.ConnectorInstance = connector;
        setConnector(connector);
        setLoading(false);
        console.log('connector', connector);
      })
      .catch((err) => {
        setError('Could not fetch connector');
        setLoading(false);
        console.log('error', err);
      });
  }, []);

  function onModelChanged(model: DataModel): void {
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
