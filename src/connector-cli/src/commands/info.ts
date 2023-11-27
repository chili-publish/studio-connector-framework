import { AnyCompilationResult, TempFileCompilationResult, compileToTempFile } from '../compiler/connectorCompiler';
import { initRuntime, evalSync } from '../qjs/qjs';
import fs from 'fs';
import { validateInputConnectorFile } from '../validation';
import { errorNoColor, info, startCommand, success, verbose } from '../logger';

export async function runGetInfo(
  connectorFile: string,
  options: any
): Promise<void> {
  startCommand('info', { connectorFile, options });
  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    errorNoColor(compilation.formattedDiagnostics);
    return;
  } else {
    success('Build succeeded -> ' + compilation.tempFile);
  }

  const properties = '\n'+ JSON.stringify(await getInfoInternal(compilation)) + '\n';

  if (options.out) {
    fs.writeFileSync(options.out ? options.out : './out.json', properties);
    info(`Written to ${options.out ? options.out : './out.json'}`);
  } else {
    process.stdout.write(properties);
  }
}

export async function getInfoInternal(compilation: TempFileCompilationResult) {
  const vm = await initRuntime(compilation.tempFile, {});

  const capabilities = evalSync(vm, 'loadedConnector.getCapabilities()');
  const configurationOptions = evalSync(
    vm,
    'loadedConnector.getConfigurationOptions();'
  );

  const properties = 
      {
        capabilities,
        configurationOptions,
      };

  return properties;
}
