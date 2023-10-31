import fs from 'fs';
import path from 'path';

export function validateInputConnectorFile(connectorFile: string): boolean {
  if (!connectorFile || fs.existsSync(connectorFile) === false) {
    console.log('connectorFile is required');
    return false;
  }
  if (path.extname(connectorFile) !== '.ts') {
    console.log('connectorFile must be a typescript file');
    return false;
  }
  return true;
}
