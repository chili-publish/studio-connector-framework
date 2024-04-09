import { TempFileCompilationResult } from '../compiler/connectorCompiler';
import { evalSync, initRuntime } from '../qjs/qjs';

export async function getInfoInternal(compilation: TempFileCompilationResult) {
  const vm = await initRuntime(compilation.tempFile, {});

  const capabilities = evalSync(vm, 'loadedConnector.getCapabilities()');
  const configurationOptions = evalSync(
    vm,
    'loadedConnector.getConfigurationOptions();'
  );

  const properties = {
    capabilities,
    configurationOptions,
  };

  return properties;
}
