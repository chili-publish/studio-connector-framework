import path from 'path';
import { compileToTempFile } from '../compiler/connectorCompiler';
import { initRuntime, evalSync } from '../qjs/qjs';
import fs from 'fs';
import { validateInputConnectorFile } from '../validation';

export async function runGetInfo(
  connectorFile: string,
  options: any
): Promise<void> {
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  const compilation = await compileToTempFile(connectorFile);

  const vm = await initRuntime(compilation.tempFile, {});

  const capabilities = evalSync(vm, 'loadedConnector.getCapabilities()');
  const configurationOptions = evalSync(
    vm,
    'loadedConnector.getConfigurationOptions();'
  );

  const properties = JSON.stringify(
    {
      capabilities,
      configurationOptions,
    },
    null,
    2
  );

  if (options.out) {
    fs.writeFileSync(options.out ? options.out : './out.json', properties);
  } else {
    process.stdout.write(properties);
  }
}
