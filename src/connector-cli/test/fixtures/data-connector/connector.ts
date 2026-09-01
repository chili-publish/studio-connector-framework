import { Connector, Data } from '@chili-publish/studio-connectors';

export default class TestDataConnector implements Data.DataConnector {
  private runtime: Connector.ConnectorRuntimeContext;

  constructor(runtime: Connector.ConnectorRuntimeContext) {
    this.runtime = runtime;
  }

  async getPage(
    _config: Data.PageConfig,
    _context: Connector.Dictionary
  ): Promise<Data.DataPage> {
    return {
      data: [],
    };
  }

  async getModel(_context: Connector.Dictionary): Promise<Data.DataModel> {
    return {
      properties: [],
    };
  }

  getConfigurationOptions(): Connector.ConnectorConfigValue[] | null {
    return [];
  }

  getCapabilities(): Data.DataConnectorCapabilities {
    return {
      filtering: false,
      sorting: false,
      model: false,
    };
  }
}
