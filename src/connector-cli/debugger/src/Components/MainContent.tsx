import { DataModel } from '../Helpers/DataModel';
import { useDebugger } from '../core/DebuggerContext';
import { GenericComponent } from './GenericComponent';

export const MainContent = ({ dataModel }: { dataModel?: DataModel }) => {
  const { metadata } = useDebugger();

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
        <GenericComponent dataModel={dataModel} />
      </div>
    </div>
  );
};
