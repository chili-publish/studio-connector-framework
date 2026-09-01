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

  it('typechecks without failing on incompatible parent @types/node', async () => {
    const typesDir = path.join(tempRoot, 'node_modules', '@types', 'node');
    fs.mkdirSync(typesDir, { recursive: true });
    fs.writeFileSync(
      path.join(typesDir, 'package.json'),
      JSON.stringify({ name: '@types/node', version: '99.0.0', types: 'index.d.ts' })
    );
    fs.writeFileSync(
      path.join(typesDir, 'index.d.ts'),
      'export const incompatible: IteratorObject<string>;\n'
    );

    const projectDir = copyFixture('media-connector', tempRoot);
    await expect(runBuild(projectDir, {})).resolves.toBeUndefined();
  });

  it('throws ExecutionError for an invalid connector', async () => {
    const projectDir = copyFixture('invalid-connector', tempRoot);
    await expect(runBuild(projectDir, {})).rejects.toBeInstanceOf(
      ExecutionError
    );
  });
});
