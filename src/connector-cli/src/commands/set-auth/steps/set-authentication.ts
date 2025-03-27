import { httpErrorHandler, isDryRun, logRequest } from '../../../core';
import { APIConnectorAuthentication } from '../types';

export async function setAuthentication(
  requestUrl: string,
  payload: APIConnectorAuthentication,
  token: string
) {
  logRequest(requestUrl, payload);

  if (isDryRun()) {
    return;
  }

  const res = await fetch(requestUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await httpErrorHandler(res);
  }
}
