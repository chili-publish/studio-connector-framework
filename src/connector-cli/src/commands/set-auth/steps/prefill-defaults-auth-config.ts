import merge from 'deepmerge-json';
import { verbose } from '../../../core';
import { AuthenticationConfig, SupportedAuth } from '../../../core/types';
import { prefillForOAuth2JwtBearer } from '../prefill-auth-data';

const configWithDefaults: Array<keyof AuthenticationConfig> = [
  SupportedAuth.OAuth2ResourceOwnerPassword,
  SupportedAuth.OAuth2AuthorizationCode,
  SupportedAuth.OAuth2JwtBearer,
];

export async function prefillWithDefaults(
  type: SupportedAuth,
  rawData: Record<string, unknown>,
  authenticationConfig?: AuthenticationConfig
): Promise<Record<string, unknown>> {
  if (configWithDefaults.includes(type as keyof AuthenticationConfig)) {
    verbose(`Preparing defaults for ${type}...`);
  }
  switch (type) {
    case SupportedAuth.OAuth2JwtBearer: {
      return prefillForOAuth2JwtBearer(
        rawData,
        authenticationConfig?.oAuth2JwtBearer
      );
    }
    case SupportedAuth.OAuth2AuthorizationCode: {
      return defaultPrefill(
        rawData,
        authenticationConfig?.oAuth2AuthorizationCode
      );
    }
    case SupportedAuth.OAuth2ResourceOwnerPassword: {
      return defaultPrefill(
        rawData,
        authenticationConfig?.oAuth2ResourceOwnerPassword
      );
    }
    default: {
      return rawData;
    }
  }
}

function defaultPrefill(
  rawData: Record<string, unknown>,
  config:
    | AuthenticationConfig['oAuth2AuthorizationCode']
    | AuthenticationConfig['oAuth2ResourceOwnerPassword']
) {
  return config ? merge(config, rawData) : rawData;
}
