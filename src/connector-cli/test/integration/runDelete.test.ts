import { runDelete } from '@cli/commands/delete';
import * as readAccessTokenModule from '@cli/core/read-access-token';
import {
  installFetchMock,
  mockJsonResponse,
} from '../helpers/mock-fetch';
import {
  cleanupTempDir,
  createTempDir,
} from '../helpers/temp-dir';

describe('runDelete', () => {
  let tempRoot: string;
  let fetchSpy: jest.SpyInstance;
  let tokenSpy: jest.SpyInstance;

  beforeEach(() => {
    tempRoot = createTempDir('delete-');
    tokenSpy = jest
      .spyOn(readAccessTokenModule, 'readAccessToken')
      .mockResolvedValue('Bearer test-token');
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    tokenSpy.mockRestore();
    cleanupTempDir(tempRoot);
  });

  it('GETs then DELETEs the connector', async () => {
    const calls: Array<{ url: string; method?: string }> = [];
    fetchSpy = installFetchMock((url, init) => {
      calls.push({ url, method: init?.method ?? 'GET' });
      if ((init?.method ?? 'GET') === 'GET') {
        return mockJsonResponse({
          id: 'conn-123',
          name: 'ToDelete',
          ownerType: 'grafx',
        });
      }
      return mockJsonResponse({});
    });

    await runDelete({
      tenant: 'prod',
      baseUrl: 'https://example.com/grafx',
      environment: 'env1',
      connectorId: 'conn-123',
    });

    expect(tokenSpy).toHaveBeenCalledWith('prod');
    expect(calls).toEqual([
      {
        url: 'https://example.com/grafx/api/v1/environment/env1/connectors/conn-123',
        method: 'GET',
      },
      {
        url: 'https://example.com/grafx/api/v1/environment/env1/connectors/conn-123',
        method: 'DELETE',
      },
    ]);
  });
});
