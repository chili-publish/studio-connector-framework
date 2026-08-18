import { DataModel } from '../../helpers/dataModel';
import { getMethodModelsForType, Models } from '../../helpers/models';
import { useApp } from '../../core/AppContext';
import { BoltIcon } from '../icons';

export const Sidebar = ({
  onModelChanged,
  activeModelName,
}: {
  onModelChanged: (model: DataModel) => void;
  activeModelName?: string;
}) => {
  const { metadata } = useApp();
  const models = getMethodModelsForType(metadata.type);
  const configurationModels = Models.Settings;

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
                <BoltIcon className="h-5 w-5 mr-sm shrink-0" />
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
                <BoltIcon className="h-5 w-5 mr-sm shrink-0" />
                {model.displayName ?? model.name}
              </button>
            ))}
          </li>
        </ul>
      </nav>
    </aside>
  );
};
