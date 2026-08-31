import fs from 'node:fs';
import path from 'node:path';
import { runBuild } from '@cli/commands/build';
import { ExecutionError } from '@cli/core/types';
import {
  cleanupTempDir,
  copyFixture,
  createTempDir,
} from '../helpers/temp-dir';

describe('runBuild', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = createTempDir('build-');
  });

  afterEach(() => {
    cleanupTempDir(tempRoot);
  });

  it('compiles a media connector to out/connector.js', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    await runBuild(projectDir, {});

    const output = path.join(projectDir, 'out', 'connector.js');
    expect(fs.existsSync(output)).toBe(true);
    expect(fs.readFileSync(output, 'utf8').length).toBeGreaterThan(0);
  });

  it('throws ExecutionError for an invalid connector', async () => {
    const projectDir = copyFixture('invalid-connector', tempRoot);
    await expect(runBuild(projectDir, {})).rejects.toBeInstanceOf(
      ExecutionError
    );
  });
});
