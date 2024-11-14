import {
  ChiliToken,
  Oauth2AuthorizationCode,
  Oauth2ClientCredentials,
  Oauth2JwtBearer,
  Oauth2ResourceOwnerPassword,
  StaticKey,
} from '../../core/types/gen-types';

export type ConnectorAuthentication =
  | ChiliToken
  | StaticKey
  | Oauth2ClientCredentials
  | Oauth2ResourceOwnerPassword
  | Oauth2AuthorizationCode
  | Oauth2JwtBearer;

export enum AuthenticationUsage {
  Browser = 'browser',
  Server = 'server',
}

export type APIConnectorAuthentication =
  | (ChiliToken & { usage: AuthenticationUsage })
  | (StaticKey & { usage: AuthenticationUsage })
  | (Oauth2ClientCredentials & { usage: AuthenticationUsage })
  | (Oauth2ResourceOwnerPassword & { usage: AuthenticationUsage })
  | (Oauth2AuthorizationCode & { usage: AuthenticationUsage.Browser })
  | (Oauth2JwtBearer & { usage: AuthenticationUsage });
