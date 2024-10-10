import { DataModel } from '../Helpers/DataModel';
import { Models } from '../Helpers/Models';

declare global {
  interface Window {
    Models: typeof Models;
  }
}

export const Sidebar = ({
  onModelChanged,
}: {
  onModelChanged: (model: DataModel) => void;
}) => {
  // get url parameter for connector type (media/font/data)
  let models: DataModel[] = [];
  const configurationModels = Models.Configuration;

  switch (Models.ConnectorMetadata?.type?.toLowerCase()) {
    case 'mediaconnector':
      Models.Media.forEach((model: DataModel) => models.push(model));
      break;
    case 'fontconnector':
      break;
    case 'dataconnector':
      Models.Data.forEach((model: DataModel) => models.push(model));
      break;
    default:
      Models.Media.forEach((model: DataModel) => models.push(model));
      break;
  }

  window.Models = Models;

  return (
    <div className="w-64 bg-blue-800 text-white p-6">
      <div className="font-bold text-xl mb-6">Connector Debugger</div>
      <nav>
        <ul>
          <li>
            <div>Configuration</div>
            {configurationModels.map((model) => (
              <a
                key={model.name}
                href="#"
                className="capitalize flex items-center py-2 px-4 bg-blue-700 rounded-md mb-2"
                onClick={() => onModelChanged(model)}
              >
                <svg
                  className="h-6 w-6 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {/* <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M3 6h18M3 18h18" /> */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {model.name}
              </a>
            ))}
          </li>
          <li>
            <div>Methods</div>
            {models.map((model) => (
              <a
                key={model.name}
                href="#"
                className="capitalize flex items-center py-2 px-4 bg-blue-700 rounded-md mb-2"
                onClick={() => onModelChanged(model)}
              >
                <svg
                  className="h-6 w-6 mr-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {/* <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12h18M3 6h18M3 18h18" /> */}
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {model.name}
              </a>
            ))}
          </li>
        </ul>
      </nav>
    </div>
  );
};
