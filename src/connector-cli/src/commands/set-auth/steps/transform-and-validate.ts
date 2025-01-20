import { verbose } from '../../../core';
import {
  Convert,
  ExecutionError,
  OAuth2AuthorizationCode,
  OAuth2ClientCredentials,
  OAuth2JwtBearer,
  OAuth2ResourceOwnerPassword,
  StaticKey,
  SupportedAuth,
} from '../../../core/types';

type ConnectorAuthentication =
  | StaticKey
  | OAuth2ClientCredentials
  | OAuth2ResourceOwnerPassword
  | OAuth2AuthorizationCode
  | OAuth2JwtBearer;

export function transformAndValidate(
  type: any,
  rawData: Record<string, unknown>
): ConnectorAuthentication {
  try {
    switch (type) {
      case SupportedAuth.StaticKey: {
        return Convert.toStaticKey(JSON.stringify(rawData));
      }
      case SupportedAuth.OAuth2ClientCredentials: {
        return Convert.toOAuth2ClientCredentials(JSON.stringify(rawData));
      }
      case SupportedAuth.OAuth2ResourceOwnerPassword: {
        return Convert.toOAuth2ResourceOwnerPassword(JSON.stringify(rawData));
      }
      case SupportedAuth.OAuth2AuthorizationCode: {
        return Convert.toOAuth2AuthorizationCode(JSON.stringify(rawData));
      }
      case SupportedAuth.OAuth2JwtBearer: {
        return Convert.toOAuth2JwtBearer(JSON.stringify(rawData));
      }
      default:
        throw new ExecutionError(`Unrecognizable authentication type: ${type}`);
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
