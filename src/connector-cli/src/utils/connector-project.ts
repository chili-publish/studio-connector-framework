import fs from 'node:fs';
import path from 'node:path';
import { verbose } from '../core';
import { ExecutionError } from '../core/types';

export const connectorFileName = 'connector.ts';
export const outputFilename = 'connector.js';
export const outputDirectory = 'out';

export function getConnectorProjectFileInfo(projectPath: string) {
  verbose('Retreiving project file information...');
  let dir = path.resolve(projectPath);
  // For backward compatibility we treat it as path to directory or to connector file
  if (projectPath.endsWith('.ts')) {
    dir = path.resolve(path.dirname(projectPath));
  }

  verbose(`Checking directory existence in ${dir}`);
  if (!fs.existsSync(dir)) {
    throw new ExecutionError(`Specified directory ${dir} doesn't exist`);
  }

  const connectorFile = path.join(dir, connectorFileName);
  verbose(`Checking connector file existence in ${connectorFile}`);
  if (!fs.existsSync(connectorFile)) {
    throw new ExecutionError(`Specified file ${connectorFile} doesn't exist`);
  }

  const packageJson = path.join(dir, 'package.json');
  verbose(`Checking "package.json" existence in ${packageJson}`);
  if (!fs.existsSync(packageJson)) {
    throw new ExecutionError(`Specified file ${packageJson} doesn't exist`);
  }

  return {
    projectDir: dir,
    connectorFile,
    packageJson,
  };
}
