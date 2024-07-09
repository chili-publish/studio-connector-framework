import { getInstalledPackageVersion } from '../../../utils/version-reader';

export function extractPackageInfo(
  projectDir: string,
  packageJsonPath: string
) {
  // Read the package.json and extract the necessary info
  const packageJson = require(packageJsonPath);

  const { description, version } = packageJson;

  // get connector sdk version
  const apiVersion = getInstalledPackageVersion(
    '@chili-publish/studio-connectors',
    projectDir
  );

  return {
    description,
    version,
    apiVersion,
  };
}
