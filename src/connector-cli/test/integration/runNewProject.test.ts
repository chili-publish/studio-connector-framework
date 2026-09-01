import fs from 'node:fs';
import path from 'node:path';
import { runNewProject } from '@cli/commands/new';
import { ConnectorType, ExecutionError } from '@cli/core/types';
import {
  cleanupTempDir,
  createTempDir,
} from '../helpers/temp-dir';

describe('runNewProject', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = createTempDir('new-');
  });

  afterEach(() => {
    cleanupTempDir(tempRoot);
  });

  it('scaffolds a media connector project', async () => {
    const out = path.join(tempRoot, 'media-out');
    await runNewProject('my-media', {
      type: ConnectorType.Media,
      connectorName: 'MyMedia',
      out,
    });

    expect(fs.existsSync(path.join(out, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'connector.ts'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'tests.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, '.gitignore'))).toBe(true);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(out, 'package.json'), 'utf8')
    );
    expect(pkg.config.type).toBe('media');
    expect(pkg.config.connectorName).toBe('MyMedia');
  });

  it('scaffolds a data connector project without tests.json', async () => {
    const out = path.join(tempRoot, 'data-out');
    await runNewProject('my-data', {
      type: ConnectorType.Data,
      connectorName: 'MyData',
      out,
    });

    expect(fs.existsSync(path.join(out, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'connector.ts'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'tests.json'))).toBe(false);
  });

  it('throws ExecutionError when package.json already exists', async () => {
    const out = path.join(tempRoot, 'existing');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'package.json'), '{}');

    await expect(
      runNewProject('existing', {
        type: ConnectorType.Media,
        connectorName: 'Existing',
        out,
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });
});
