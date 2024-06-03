import {
  ChiliToken,
  StaticKey,
  Oauth2ClientCredentials,
  Oauth2ResourceOwnerPassword,
  Oauth2AuthorizationCode,
} from '../../core/types/gen-types';

export type ConnectorAuthentication =
  | ChiliToken
  | StaticKey
  | Oauth2ClientCredentials
  | Oauth2ResourceOwnerPassword
  | Oauth2AuthorizationCode;

export enum AuthenticationUsage {
  Browser = 'browser',
  Server = 'server',
}

export type APIConnectorAuthentication =
  | (ChiliToken & { usage: AuthenticationUsage })
  | (StaticKey & { usage: AuthenticationUsage })
  | (Oauth2ClientCredentials & { usage: AuthenticationUsage })
  | (Oauth2ResourceOwnerPassword & { usage: AuthenticationUsage })
  | (Oauth2AuthorizationCode & { usage: AuthenticationUsage.Browser });
