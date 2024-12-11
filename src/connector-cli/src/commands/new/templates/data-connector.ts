import { connectorFileName } from '../../../utils/connector-project';

const connectorFileContent = `import { Connector, Data } from "@chili-publish/studio-connectors";

export default class MyConnector implements Data.DataConnector {

  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  getPage(
    config: Data.PageConfig,
    context: Connector.Dictionary
  ): Promise<Data.DataPage> {
    throw new Error('Method not implemented.');
  }

  getModel(context: Connector.Dictionary): Promise<Data.DataModel> {
    throw new Error('Method not implemented.');
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [];
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: false,
      sorting: false,
      model: false,
    }
  }
}`;
export const getDataConnectorFile = () => ({
  content: connectorFileContent,
  fileName: connectorFileName,
});
