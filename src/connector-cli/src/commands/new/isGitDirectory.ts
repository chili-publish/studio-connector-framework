import { execSync } from 'child_process';
import { verbose } from '../../core';

export function isGitDirectory(dir: string): boolean {
  // Checking whether currenct directory is a git directory

  verbose(`Checking whether the current directory is a git directory`);

  try {
    execSync(`git rev-parse --is-inside-work-tree`, {
      cwd: dir,
      encoding: 'utf-8',
      stdio: 'ignore',
    });
    return true;
  } catch (error) {
    verbose((error as Error).message);
    return false;
  }
}
