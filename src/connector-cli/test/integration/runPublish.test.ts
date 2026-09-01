import fs from 'node:fs';
import path from 'node:path';
import { runPublish } from '@cli/commands/publish';
import { setExecutionContext } from '@cli/core/execution-context';
import { ExecutionError } from '@cli/core/types';
import * as versionReader from '@cli/utils/version-reader';
import {
  cleanupTempDir,
  copyFixture,
  createTempDir,
} from '../helpers/temp-dir';

describe('runPublish', () => {
  let tempRoot: string;
  let fetchSpy: jest.SpyInstance;
  let versionSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('publish-');
    fetchSpy = jest.spyOn(global, 'fetch');
    versionSpy = jest
      .spyOn(versionReader, 'getInstalledPackageVersion')
      .mockReturnValue('1.41.0');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    versionSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('writes create payload to dry-run-out without calling fetch', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    const dryRunOut = path.join(tempRoot, 'publish.json');

    setExecutionContext({ dryRunOut });
    await runPublish(projectDir, {
      tenant: 'prod',
      baseUrl: 'https://example.com/grafx',
      environment: 'env1',
      'proxyOption.allowedDomains': ['api.example.com'],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fs.existsSync(dryRunOut)).toBe(true);
    const payload = JSON.parse(fs.readFileSync(dryRunOut, 'utf8'));
    expect(payload.requestUrl).toContain(
      '/api/v1/environment/env1/connectors'
    );
    expect(payload.requestPayload.name).toBe('TestMediaConnector');
    expect(payload.requestPayload.script).toBeDefined();
    expect(payload.requestPayload.allowedDomains).toEqual(['api.example.com']);
  });

  it('writes update payload when connectorId is provided', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    const dryRunOut = path.join(tempRoot, 'publish-update.json');

    setExecutionContext({ dryRunOut });
    await runPublish(projectDir, {
      tenant: 'prod',
      baseUrl: 'https://example.com/grafx',
      environment: 'env1',
      connectorId: 'conn-123',
      'proxyOption.allowedDomains': ['api.example.com'],
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    const payload = JSON.parse(fs.readFileSync(dryRunOut, 'utf8'));
    expect(payload.requestUrl).toContain('/connectors/conn-123');
    expect(payload.requestPayload.name).toBe('TestMediaConnector');
  });

  it('throws ExecutionError for invalid allowed domains', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    setExecutionContext({ dryRunOut: path.join(tempRoot, 'unused.json') });
    await expect(
      runPublish(projectDir, {
        tenant: 'prod',
        baseUrl: 'https://example.com/grafx',
        environment: 'env1',
        'proxyOption.allowedDomains': ['*'],
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });
});
