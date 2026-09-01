import fs from 'node:fs';
import path from 'node:path';
import { runDeleteAuth } from '@cli/commands/delete-auth';
import { AuthenticationUsage } from '@cli/commands/set-auth/types';
import { setExecutionContext } from '@cli/core/execution-context';
import { Tenant } from '@cli/core/types';
import {
  cleanupTempDir,
  createTempDir,
} from '../helpers/temp-dir';

describe('runDeleteAuth', () => {
  let tempRoot: string;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('delete-auth-');
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('writes delete-auth request to dry-run-out without calling fetch', async () => {
    const dryRunOut = path.join(tempRoot, 'delete-auth.json');

    setExecutionContext({ dryRunOut });
    await runDeleteAuth({
      tenant: Tenant.Prod,
      environment: 'env1',
      baseUrl: 'https://example.com/grafx',
      connectorId: 'conn-123',
      usage: AuthenticationUsage.Server,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    const payload = JSON.parse(fs.readFileSync(dryRunOut, 'utf8'));
    expect(payload.requestUrl).toContain('/connectors/conn-123/auth');
    expect(payload.requestUrl).toContain('authUsage=server');
    expect(payload.requestPayload).toEqual({ usage: 'server' });
  });
});
