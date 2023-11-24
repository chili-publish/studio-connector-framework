import { useState } from 'react';
import './App.css'
import { ConnectorMetadata, DataModel } from './DataModel';
import { GenericComponent } from './Components/GenericComponent';
import { initRuntime } from './ConnectorRuntime';
// import react
import { useEffect } from 'react';

const MainContent = ({ dataModel }: { dataModel?: DataModel }) => {

  if (!dataModel) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-gray-600">Select a connector method from the sidebar</div>
        </div>
      </div>
    );
  }

  return (

    <div className="flex-1 p-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4 border-b pb-4">
          <h1 className="text-xl font-semibold">{Models.ConnectorMetadata?.name}</h1>
          <p className="text-gray-600">{Models.ConnectorMetadata?.type}</p>
        </div>
        <GenericComponent dataModel={dataModel} />
      </div>
    </div>
  );
};

const Models: {
  ConnectorMetadata: ConnectorMetadata | null;
  ConnectorInstance: any; Auth: DataModel, Media: DataModel[] 
} = {
  ConnectorMetadata: null,
  ConnectorInstance: null,
  Auth: {
    name: "Authentication",
    parameters: [
      {
        name: "HttpHeaders",
        componentType: "dictionary",
      },
    ],
    isAsync: false,
    invoke: async (values: any[]) => {
      console.log("invoke authentication", values);
      return {};
    },
    returnJson: false,
    returnJsonArray: false,
    returnsImage: false,
    isInvokable: false,
  },
  Media: [
    {
      name: "download",
      parameters: [
        {
          name: "id",
          componentType: "text",
        },
        { 
          name: 'downloadType',
          componentType: 'list',
          list: ['thumbnail', 'preview', 'original']
        },
        {
          name: 'downloadIntent',
          componentType: 'list',
          list: ['attachment', 'inline']
        },
        {
          name: "context",
          componentType: "dictionary",
        },
      ],
      invoke: async (values: any[]) => {
        const result = await Models.ConnectorInstance.download(values[0], values[1], values[2], values[3]);
        console.table({ request: values, result });
        return result;
      },
      isAsync: true,
      returnJson: false,
      returnJsonArray: false,
      returnsImage: true,
      isInvokable: true
    },
    {
      isInvokable: true,
      name: "query",
      parameters: [
        {
          name: "queryOptions",
          componentType: "complex",
          complex: [
            {
              name: "token",
              componentType: "text",
            },
            {
              name: "filter",
              componentType: "text",
            },
            {
              name: "collection",
              componentType: "text",
            },
            {
              name: "pageSize",
              componentType: "text",
            },
          ],
        },
        {
          name: "context",
          componentType: "dictionary",
        },
      ],
      invoke: async (values: any[]) => {
        
        const result = await Models.ConnectorInstance.query(values[0], values[1]);
        
        console.table({ request: values, result });

        return result;
      },
      isAsync: true,
      returnJson: true,
      returnJsonArray: false,
      returnsImage: false
    }
  ]

}

const Sidebar = ({ onModelChanged }: { onModelChanged: (model: DataModel) => void }) => {

  // get url parameter for connector type (media/font/data)

  let models: DataModel[] = [];

  models.push(Models.Auth);

  switch (Models.ConnectorMetadata?.type) {
    case "MediaConnector":
      Models.Media.forEach((model) => models.push(model));
      break;
    case "FontConnector":
      break;
    case "DataConnector":
      break;
    default:
      Models.Media.forEach((model) => models.push(model));
      break;
  }

  window.Models = Models;

  return (
    <div className="w-64 bg-blue-800 text-white p-6">
      <div className="font-bold text-xl mb-6">Connector Debugger</div>
      <nav>
        {models.map((model) => (
          <a key={model.name} href="#" className="capitalize flex items-center py-2 px-4 bg-blue-700 rounded-md mb-2" onClick={() => onModelChanged(model)}>
            <svg className="h-6 w-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {/* <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M3 6h18M3 18h18" /> */}
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {model.name}
          </a>
        ))}
      </nav>
    </div>
  );
};

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
      }).catch((err) => {
        setError("Could not fetch connector");
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
    type: new URLSearchParams(window.location.search).get("type") ?? 'FontConnector',
    getDisplayType: function () {
      switch (this.type) {
        case "MediaConnector":
          return "Media Connector";
        case "FontConnector":
          return "Font Connector";
        case "DataConnector":
          return "Data Connector";
        default:
          return "Media Connector";
      }
    },
  };

  return (
    <div className="h-screen flex">
      <Sidebar onModelChanged={onModelChanged} />
      <MainContent dataModel={dataModel} />
    </div>
  )
}

export default App;