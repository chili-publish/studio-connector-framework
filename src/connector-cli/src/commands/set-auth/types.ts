import {
  OAuth2AuthorizationCode,
  OAuth2ClientCredentials,
  OAuth2JwtBearer,
  OAuth2ResourceOwnerPassword,
  StaticKey,
} from '../../core/types';

export enum AuthenticationUsage {
  Browser = 'browser',
  Server = 'server',
}

export type APIConnectorAuthentication =
  | (StaticKey & { usage: AuthenticationUsage })
  | (OAuth2ClientCredentials & { usage: AuthenticationUsage })
  | (OAuth2ResourceOwnerPassword & { usage: AuthenticationUsage })
  | (OAuth2AuthorizationCode & { usage: AuthenticationUsage.Browser })
  | (OAuth2JwtBearer & { usage: AuthenticationUsage });
