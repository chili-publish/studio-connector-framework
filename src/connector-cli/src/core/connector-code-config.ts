import { Connector, Media } from '@chili-publish/studio-connectors';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { evalSync, initRuntime } from '../qjs/qjs';
import { ExecutionError } from './types';

export async function readConnectorCodeConfig(connectorFilePath: string) {
  const compilation = await compileToTempFile(connectorFilePath);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  const vm = await initRuntime(compilation.tempFile, {});

  const capabilities: Media.MediaConnectorCapabilities = evalSync(
    vm,
    'loadedConnector.getCapabilities()'
  );
  const configurationOptions: Connector.ConnectorConfigValue[] = evalSync(
    vm,
    'loadedConnector.getConfigurationOptions();'
  );

  const properties = {
    capabilities,
    configurationOptions,
  };

  return properties;
}
