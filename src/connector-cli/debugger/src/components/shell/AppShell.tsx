import { DataModel } from '../../helpers/dataModel';
import { MainContent } from './MainContent';
import { Sidebar } from './Sidebar';
import { Toast } from './Toast';

export function AppShell({
  dataModel,
  onModelChanged,
}: {
  dataModel: DataModel | undefined;
  onModelChanged: (model: DataModel) => void;
}) {
  return (
    <div className="dbg-app">
      <Sidebar
        onModelChanged={onModelChanged}
        activeModelName={dataModel?.name}
      />
      <MainContent key={dataModel?.name} dataModel={dataModel} />
      <Toast />
    </div>
  );
}
