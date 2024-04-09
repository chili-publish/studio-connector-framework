import { compileToTempFile } from '../compiler/connectorCompiler';
import fs from 'fs';
import path from 'path';
import { validateInputConnectorFile } from '../validation';
import { errorNoColor, info, startCommand, success } from '../logger';
import { getInfoInternal } from '../execution-util';

interface GetInfoCommandOptions {
  out?: string;
}

export async function runGetInfo(
  connectorFile: string,
  options: GetInfoCommandOptions
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

  const properties =
    '\n' + JSON.stringify(await getInfoInternal(compilation), null, 2) + '\n';

  if (options.out) {
    fs.writeFileSync(path.resolve(options.out), properties);
    info(`Written to ${options.out}`);
  } else {
    process.stdout.write(properties);
  }
}
