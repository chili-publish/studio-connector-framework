import { runUpdate } from '@cli/commands/update';
import * as readAccessTokenModule from '@cli/core/read-access-token';
import { ExecutionError } from '@cli/core/types';
import {
  installFetchMock,
  mockJsonResponse,
} from '../helpers/mock-fetch';
import {
  cleanupTempDir,
  createTempDir,
} from '../helpers/temp-dir';

describe('runUpdate', () => {
  let tempRoot: string;
  let fetchSpy: jest.SpyInstance;
  let tokenSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('update-');
    tokenSpy = jest
      .spyOn(readAccessTokenModule, 'readAccessToken')
      .mockResolvedValue('Bearer test-token');
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    tokenSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('throws ExecutionError when no update flags are provided', async () => {
    await expect(
      runUpdate({
        tenant: 'prod',
        baseUrl: 'https://example.com/grafx',
        environment: 'env1',
        connectorId: 'conn-123',
      })
    ).rejects.toBeInstanceOf(ExecutionError);
  });

  it('PATCHes enabled and name conversion', async () => {
    let patchBody: unknown;
    fetchSpy = installFetchMock((url, init) => {
      if ((init?.method ?? 'GET') === 'GET') {
        return mockJsonResponse({
          id: 'conn-123',
          name: 'OldName',
          ownerType: 'grafx',
        });
      }
      patchBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      return mockJsonResponse({});
    });

    await runUpdate({
      tenant: 'prod',
      baseUrl: 'https://example.com/grafx',
      environment: 'env1',
      connectorId: 'conn-123',
      enabled: 'true',
      name: 'NewName',
    });

    expect(tokenSpy).toHaveBeenCalledWith('prod');
    expect(patchBody).toEqual({ enabled: true, name: 'NewName' });
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/grafx/api/v1/environment/env1/connectors/conn-123',
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});
