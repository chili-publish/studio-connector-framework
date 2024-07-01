export function getRequestUrl(baseUrl: string, environment: string) {
  const connectorEndpointBaseUrl = new URL(baseUrl);
  if (!connectorEndpointBaseUrl.pathname.endsWith('/')) {
    connectorEndpointBaseUrl.pathname += '/';
  }
  connectorEndpointBaseUrl.pathname += `api/v1/environment/${environment}/connectors`;
  return connectorEndpointBaseUrl.toString();
}
