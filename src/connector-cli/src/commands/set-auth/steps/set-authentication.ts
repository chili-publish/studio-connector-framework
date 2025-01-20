import { httpErrorHandler, info, isDryRun, verbose } from '../../../core';
import { APIConnectorAuthentication } from '../types';

export async function setAuthentication(
  requestUrl: string,
  payload: APIConnectorAuthentication,
  token: string
) {
  const msg = `Deploying connector:\n requestUrl: "${requestUrl}\n payload:${JSON.stringify(
    payload,
    null,
    2
  )}\n`;

  if (isDryRun()) {
    info(msg);
    return;
  }

  verbose(msg);

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
