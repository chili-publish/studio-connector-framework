import { httpErrorHandler, verbose } from '../../../core';
import { APIConnectorAuthentication } from '../types';

export async function setAuthentication(
  requestUrl: string,
  payload: APIConnectorAuthentication,
  token: string
) {
  verbose(
    `Deploying connector:\n requestUrl: "${requestUrl}\n payload:${JSON.stringify(
      payload,
      null,
      2
    )}\n`
  );

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
