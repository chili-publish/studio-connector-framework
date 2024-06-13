import path from 'node:path';
import fs from 'node:fs';
import { load } from 'js-yaml';
import { ExecutionError } from '../../../core/types';
import { verbose } from '../../../core';

export function extractAuthData(filePath: string): Record<string, unknown> {
  const authDataFile = path.resolve(filePath);

  verbose(`Reading from ${authDataFile}`);
  if (!fs.existsSync(authDataFile)) {
    throw new ExecutionError('There is no file specified by "auth-data-file"');
  }

  let dirtyAuthData;

  if (authDataFile.endsWith('.json')) {
    dirtyAuthData = require(authDataFile);
  } else if (authDataFile.endsWith('.yaml') || authDataFile.endsWith('.yml')) {
    dirtyAuthData = load(fs.readFileSync(authDataFile, 'utf-8'));
  } else {
    throw new ExecutionError(
      'Unsupported file format of the "auth-data-file". Should be one of "json", "yaml" or "yml"'
    );
  }

  return dirtyAuthData;
}
