import { buildRequestUrl } from '../../common/build-request-url';
import { info, readAccessToken, startCommand } from '../../core';
import { ExecutionError } from '../../core/types';
import { patchConnector } from './steps/patch-connector';
import { parseBoolean } from '../../utils/parse-boolean';

interface UpdateCommandOptions {
  tenant: 'dev' | 'prod';
  baseUrl: string;
  environment: string;
  connectorId: string;
  enabled?: string;
  default?: string;
  name?: string;
}

export async function runUpdate(options: UpdateCommandOptions): Promise<void> {
  startCommand('update', { options });

  const { enabled, default: defaultFlag, name } = options;

  const payload: {
    enabled?: boolean;
    default?: boolean;
    name?: string;
  } = {};
  if (enabled !== undefined) payload.enabled = parseBoolean(enabled);
  if (defaultFlag !== undefined) payload.default = parseBoolean(defaultFlag);
  if (name !== undefined) payload.name = name;

  if (Object.keys(payload).length === 0) {
    throw new ExecutionError(
      'At least one of --enabled, --default or --name must be provided'
    );
  }

  const accessToken = await readAccessToken(options.tenant);

  info('Build full request URL...');
  const requestUrl = buildRequestUrl(options.baseUrl, options.environment);

  await patchConnector(
    requestUrl,
    options.connectorId,
    accessToken,
    payload
  );
}
