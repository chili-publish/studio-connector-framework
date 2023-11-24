import { DataModel } from '../Helpers/DataModel';
import { GenericComponent } from './GenericComponent';
import { Models } from '../Helpers/Models';

export const MainContent = ({ dataModel }: { dataModel?: DataModel }) => {
  if (!dataModel) {
    return (
      <div className="flex-1 p-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-gray-600">
            Select a connector method from the sidebar
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4 border-b pb-4">
          <h1 className="text-xl font-semibold">
            {Models.ConnectorMetadata?.name}
          </h1>
          <p className="text-gray-600">{Models.ConnectorMetadata?.type}</p>
        </div>
        <GenericComponent dataModel={dataModel} />
      </div>
    </div>
  );
};
