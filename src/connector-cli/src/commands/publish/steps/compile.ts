import path from 'node:path';
import fs from 'node:fs';
import { ExecutionError } from '../../../core/types';
import { verbose } from '../../../core';
import { compileToTempFile } from '../../../compiler/connectorCompiler';

export async function compileConnector(connectorFile: string) {
  // Compile connector
  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  verbose('Compiled -> ' + compilation.tempFile);

  // Read the connector.js file
  return {
    connectorJs: fs.readFileSync(path.resolve(compilation.tempFile), 'utf8'),
    connectorTs: fs.readFileSync(path.resolve(connectorFile), 'utf8'),
  };
}
