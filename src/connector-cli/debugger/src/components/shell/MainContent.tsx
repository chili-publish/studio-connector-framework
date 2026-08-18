import { DataModel } from '../../helpers/dataModel';
import { useApp } from '../../core/AppContext';
import { ModelView } from '../ModelView';

export const MainContent = ({ dataModel }: { dataModel?: DataModel }) => {
  const { metadata } = useApp();

  if (!dataModel) {
    return (
      <div className="dbg-main">
        <div className="dbg-card">
          <div className="dbg-state-empty min-h-0 justify-start p-0 bg-transparent">
            Select a connector method or configuration from the sidebar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dbg-main">
      <div className="dbg-card flex-1 overflow-y-auto">
        <div className="mb-md border-b border-border-subtle pb-md">
          <h1 className="text-header text-text-primary">{metadata.name}</h1>
          <p className="text-regular text-text-secondary mt-xxs">
            {metadata.getDisplayType()}
          </p>
        </div>
        <ModelView dataModel={dataModel} />
      </div>
    </div>
  );
};
