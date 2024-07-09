import fs from 'node:fs';
import path from 'node:path';
import { compileToTempFile } from '../../../compiler/connectorCompiler';
import { verbose } from '../../../core';
import { ExecutionError } from '../../../core/types';

export async function compileConnector(connectorFile: string) {
  // Compile connector
  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    throw new ExecutionError(compilation.formattedDiagnostics);
  }

  verbose('Compiled -> ' + compilation.tempFile);

  // Read the output file and connector file
  return {
    connectorJs: fs.readFileSync(path.resolve(compilation.tempFile), 'utf8'),
    connectorTs: fs.readFileSync(path.resolve(connectorFile), 'utf8'),
  };
}
