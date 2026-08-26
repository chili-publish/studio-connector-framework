import { DataModel } from '../Helpers/DataModel';
import { Models } from '../Helpers/Models';

declare global {
  interface Window {
    Models: typeof Models;
  }
}

export const Sidebar = ({
  onModelChanged,
  activeModelName,
}: {
  onModelChanged: (model: DataModel) => void;
  activeModelName?: string;
}) => {
  // get url parameter for connector type (media/font/data)
  let models: DataModel[] = [];
  const configurationModels = Models.Settings;

  switch (Models.ConnectorMetadata?.type) {
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

  const navItemClass = (modelName: string) =>
    `dbg-nav-item${activeModelName === modelName ? ' dbg-nav-item-active' : ''}`;

  return (
    <aside className="dbg-sidebar">
      <div className="dbg-sidebar-title">Connector Debugger</div>
      <nav>
        <ul>
          <li>
            <div className="dbg-sidebar-section">Settings</div>
            {configurationModels.map((model) => (
              <a
                key={model.name}
                href="#"
                className={navItemClass(model.name)}
                onClick={(event) => {
                  event.preventDefault();
                  onModelChanged(model);
                }}
              >
                <svg
                  className="h-5 w-5 mr-sm shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {model.displayName ?? model.name}
              </a>
            ))}
          </li>
          <li>
            <div className="dbg-sidebar-section">Methods</div>
            {models.map((model) => (
              <a
                key={model.name}
                href="#"
                className={navItemClass(model.name)}
                onClick={(event) => {
                  event.preventDefault();
                  onModelChanged(model);
                }}
              >
                <svg
                  className="h-5 w-5 mr-sm shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {model.displayName ?? model.name}
              </a>
            ))}
          </li>
        </ul>
      </nav>
    </aside>
  );
};
