export function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

export function installFetchMock(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>
): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockImplementation(((
    input: RequestInfo | URL,
    init?: RequestInit
  ) => {
    const url = typeof input === 'string' ? input : input.toString();
    return Promise.resolve(handler(url, init));
  }) as typeof fetch);
}
