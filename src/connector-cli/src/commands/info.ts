import {initRuntime, evalSync} from '../qjs/qjs';
import fs from 'fs';

export async function runGetInfo(
  connectorFile: string,
  options: any,
): Promise<void> {
  if (!connectorFile || fs.existsSync(connectorFile) === false) {
    console.log('connectorFile is required');
    return;
  }
  const vm = await initRuntime(connectorFile, {});

  const capabilities = evalSync(vm, 'loadedConnector.getCapabilities()');
  const configurationOptions = evalSync(
    vm,
    'loadedConnector.getConfigurationOptions();',
  );

  const properties = JSON.stringify(
    {
      capabilities,
      configurationOptions,
    },
    null,
    2,
  );

  if (options.out) {
    fs.writeFileSync(options.out ? options.out : './out.json', properties);
  } else {
    process.stdout.write(properties);
  }
}
