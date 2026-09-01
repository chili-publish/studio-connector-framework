import fs from 'node:fs';
import path from 'node:path';
import { runSetAuth } from '@cli/commands/set-auth';
import { AuthenticationUsage } from '@cli/commands/set-auth/types';
import { setExecutionContext } from '@cli/core/execution-context';
import { ExecutionError, SupportedAuth, Tenant } from '@cli/core/types';
import {
  cleanupTempDir,
  copyFixture,
  createTempDir,
} from '../helpers/temp-dir';

describe('runSetAuth', () => {
  let tempRoot: string;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('set-auth-');
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('writes auth payload to dry-run-out without calling fetch', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    const authFile = path.join(
      __dirname,
      '..',
      'fixtures',
      'auth',
      'static-key.json'
    );
    const dryRunOut = path.join(tempRoot, 'set-auth.json');

    setExecutionContext({ dryRunOut });
    await runSetAuth(projectDir, {
      tenant: Tenant.Prod,
      environment: 'env1',
      baseUrl: 'https://example.com/grafx',
      connectorId: 'conn-123',
      usage: AuthenticationUsage.Browser,
      type: SupportedAuth.StaticKey,
      authDataFile: authFile,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    const payload = JSON.parse(fs.readFileSync(dryRunOut, 'utf8'));
    expect(payload.requestUrl).toContain('/auth/static');
    expect(payload.requestPayload).toEqual(
      expect.objectContaining({
        usage: 'browser',
        key: 'api-key',
        value: 'secret-value',
        name: 'test-static-key',
      })
    );
  });

  it('throws ExecutionError for unsupported auth type', async () => {
    const projectDir = copyFixture('media-connector', tempRoot);
    const authFile = path.join(
      __dirname,
      '..',
      'fixtures',
      'auth',
      'static-key.json'
    );

    setExecutionContext({ dryRunOut: path.join(tempRoot, 'unused.json') });
    await expect(
      runSetAuth(projectDir, {
        tenant: Tenant.Prod,
        environment: 'env1',
        baseUrl: 'https://example.com/grafx',
        connectorId: 'conn-123',
        usage: AuthenticationUsage.Browser,
        type: SupportedAuth.OAuth2ClientCredentials,
        authDataFile: authFile,
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });
});
