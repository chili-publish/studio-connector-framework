import { DataModel } from '../Helpers/DataModel';
import { Models } from '../Helpers/Models';
import { useDebugger } from '../core/DebuggerContext';

export const Sidebar = ({
  onModelChanged,
  activeModelName,
}: {
  onModelChanged: (model: DataModel) => void;
  activeModelName?: string;
}) => {
  const { metadata } = useDebugger();
  let models: DataModel[] = [];
  const configurationModels = Models.Settings;

  switch (metadata.type) {
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
              <button
                key={model.name}
                type="button"
                className={navItemClass(model.name)}
                aria-current={
                  activeModelName === model.name ? 'page' : undefined
                }
                onClick={() => onModelChanged(model)}
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
              </button>
            ))}
          </li>
          <li>
            <div className="dbg-sidebar-section">Methods</div>
            {models.map((model) => (
              <button
                key={model.name}
                type="button"
                className={navItemClass(model.name)}
                aria-current={
                  activeModelName === model.name ? 'page' : undefined
                }
                onClick={() => onModelChanged(model)}
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
              </button>
            ))}
          </li>
        </ul>
      </nav>
    </aside>
  );
};
