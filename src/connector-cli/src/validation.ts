import fs from 'fs';
import path from 'path';
import { error } from './logger';

export function validateInputConnectorFile(connectorFile: string): boolean {
  connectorFile = connectorFile || './connector.ts';
  if (!connectorFile || fs.existsSync(connectorFile) === false) {
    error('connectorFile is required');
    return false;
  }
  if (path.extname(connectorFile) !== '.ts') {
    error('connectorFile must be a typescript file');
    return false;
  }
  return true;
}
