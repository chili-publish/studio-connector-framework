import { SupportedAuth } from '../../../core/types/gen-types';

export function getRequestUrl(
  baseUrl: string,
  environment: string,
  connectorId: string,
  type: SupportedAuth
) {
  const connectorEndpointBaseUrl = new URL(baseUrl);
  if (!connectorEndpointBaseUrl.pathname.endsWith('/')) {
    connectorEndpointBaseUrl.pathname += '/';
  }
  connectorEndpointBaseUrl.pathname += `api/v1/environment/${environment}/connectors/${connectorId}`;
  switch (type) {
    case SupportedAuth.Chili: {
      connectorEndpointBaseUrl.pathname += '/auth/chili';
      break;
    }
    case SupportedAuth.StaticKey: {
      connectorEndpointBaseUrl.pathname += '/auth/static';
      break;
    }
    case SupportedAuth.OAuth2ClientCredentials: {
      connectorEndpointBaseUrl.pathname += '/auth/oauth-client-credentials';
      break;
    }
    case SupportedAuth.OAuth2ResourceOwnerPassword: {
      connectorEndpointBaseUrl.pathname +=
        '/auth/oauth-resource-owner-password';
      break;
    }
    case SupportedAuth.OAuth2AuthorizationCode: {
      connectorEndpointBaseUrl.pathname += '/auth/oauth-authorization-code';
      break;
    }
  }
  return connectorEndpointBaseUrl.toString();
}
