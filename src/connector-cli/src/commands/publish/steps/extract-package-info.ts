import path from 'path';
import { getInstalledPackageVersion } from '../../../utils/version-reader';

export function extractPackageInfo(connectorFile: string) {
  const dir = path.dirname(path.resolve(connectorFile));

  // Read the package.json and extract the necessary info
  const packageJson = require(path.join(dir, 'package.json'));

  const { description, version } = packageJson;

  // get connector sdk version
  const apiVersion = getInstalledPackageVersion(
    '@chili-publish/studio-connectors',
    dir
  );

  return {
    description,
    version,
    apiVersion,
  };
}
