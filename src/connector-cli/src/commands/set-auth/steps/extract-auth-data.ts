import { load } from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { verbose } from '../../../core';
import { ExecutionError } from '../../../core/types';

export function extractAuthData(filePath: string): Record<string, unknown> {
  const authDataFile = path.resolve(filePath);

  verbose(`Reading from ${authDataFile}`);
  if (!fs.existsSync(authDataFile)) {
    throw new ExecutionError('There is no file specified by "auth-data-file"');
  }

  if (authDataFile.endsWith('.json')) {
    return require(authDataFile);
  } else if (authDataFile.endsWith('.yaml') || authDataFile.endsWith('.yml')) {
    return load(fs.readFileSync(authDataFile, 'utf-8')) as Record<
      string,
      unknown
    >;
  } else {
    throw new ExecutionError(
      'Unsupported file format of the "auth-data-file". Should be one of "json", "yaml" or "yml"'
    );
  }
}
