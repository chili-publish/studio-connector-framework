import { verbose } from '../../../core';
import {
  ConnectorConfig,
  SupportedAuth,
  Convert,
  ExecutionError,
} from '../../../core/types';
import { ConnectorAuthentication } from '../types';

export function validateAuthType(
  type: SupportedAuth,
  dirtyAuthData: Record<string, unknown>,
  supportedAuth: Required<ConnectorConfig>['supportedAuth']
): ConnectorAuthentication {
  if (!supportedAuth.includes(type)) {
    throw new ExecutionError(
      `You are trying to set unsupported authentication "${type}". Please specify one of [${supportedAuth
        .map((sa) => '"' + sa + '"')
        .join(', ')}]`
    );
  }

  try {
    switch (type) {
      case SupportedAuth.Chili: {
        return Convert.toChiliToken(JSON.stringify(dirtyAuthData));
      }
      case SupportedAuth.StaticKey: {
        return Convert.toStaticKey(JSON.stringify(dirtyAuthData));
      }
      case SupportedAuth.OAuth2ClientCredentials: {
        return Convert.toOauth2ClientCredentials(JSON.stringify(dirtyAuthData));
      }
      case SupportedAuth.OAuth2ResourceOwnerPassword: {
        return Convert.toOauth2ResourceOwnerPassword(
          JSON.stringify(dirtyAuthData)
        );
      }
      case SupportedAuth.OAuth2AuthorizationCode: {
        return Convert.toOauth2AuthorizationCode(JSON.stringify(dirtyAuthData));
      }
    }
  } catch (error) {
    // Invalid data provided
    const err = error as Error;
    if (err.message.startsWith('Invalid value')) {
      verbose(err.message);
      throw new ExecutionError(
        `Provided auth data is in invalid format for provided "${type}" authentication type. Execute command with --verbose flag for more information about error`
      );
    }
    throw err;
  }
}
