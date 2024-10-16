import { DataModel } from '../Helpers/DataModel';
import { Models } from '../Helpers/Models';
import { GenericComponent } from './GenericComponent';

export const MainContent = ({ dataModel }: { dataModel?: DataModel }) => {
  if (!dataModel) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-gray-600">
            Select a connector "method" of "configuration" from the sidebar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 flex flex-col overflow-y-auto">
      <div className="bg-white shadow rounded-lg p-6 flex flex-col flex-1 overflow-y-auto">
        <div className="mb-4 border-b pb-4">
          <h1 className="text-xl font-semibold">
            {Models.ConnectorMetadata?.name}
          </h1>
          <p className="text-gray-600">
            {Models.ConnectorMetadata?.getDisplayType()}
          </p>
        </div>
        <GenericComponent dataModel={dataModel} />
      </div>
    </div>
  );
};
