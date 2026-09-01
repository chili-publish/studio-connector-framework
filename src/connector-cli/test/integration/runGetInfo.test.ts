import fs from 'node:fs';
import path from 'node:path';
import { runGetInfo } from '@cli/commands/info';
import * as connectorCodeConfig from '@cli/core/connector-code-config';
import * as versionReader from '@cli/utils/version-reader';
import {
  cleanupTempDir,
  copyFixture,
  createTempDir,
} from '../helpers/temp-dir';

// Skip compile + QuickJS: this suite covers CLI info output, not the WASM runtime.
jest.mock('@cli/core/connector-code-config', () => ({
  readConnectorCodeConfig: jest.fn(),
}));

describe('runGetInfo', () => {
  let tempRoot: string;
  let versionSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('info-');
    versionSpy = jest
      .spyOn(versionReader, 'getInstalledPackageVersion')
      .mockReturnValue('1.41.0');
    jest.mocked(connectorCodeConfig.readConnectorCodeConfig).mockResolvedValue({
      capabilities: { query: true, detail: true },
      configurationOptions: [],
    });
  });

  afterEach(() => {
    versionSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('writes connector metadata to the out file', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    const outFile = path.join(tempRoot, 'info.json');

    await runGetInfo(projectDir, { out: outFile });

    expect(fs.existsSync(outFile)).toBe(true);
    const info = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    expect(info.type).toBe('media');
    expect(info.logoUrl).toBe('https://example.com/logo.png');
    expect(info.supportedAuth).toEqual(['staticKey']);
    expect(info.capabilities).toEqual(
      expect.objectContaining({
        query: true,
        detail: true,
      })
    );
    expect(info.apiVersion).toBeDefined();
  });
});
