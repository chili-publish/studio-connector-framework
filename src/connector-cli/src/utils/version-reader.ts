import { execSync } from 'child_process';
import { error } from '../core';

export function getInstalledPackageVersion(
  packageName: string,
  resolvedDirectory: string
) {
  try {
    // Execute the npm list command synchronously
    const stdout = execSync(`npm list ${packageName}`, {
      cwd: resolvedDirectory,
    });

    // Extract the version number from the output, considering both deduped and non-deduped cases
    const versionRegex = new RegExp(`${packageName}@(.+?)(\\s|$)`, 'g');
    let versionMatch;
    let version;

    while ((versionMatch = versionRegex.exec(stdout.toString())) !== null) {
      // This will capture the last occurrence, which should be the actual installed version
      version = versionMatch[1];
    }

    if (!version) {
      throw new Error(
        `The installed version of ${packageName} could not be determined.`
      );
    }
    return version;
  } catch (err: any) {
    error(`Error: ${err.message}`);
    throw err;
  }
}
