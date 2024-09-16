export interface ProxyOptions {
  allowedDomains: Array<string>;
  forwardedHeaders: true;
}

interface ConnectorPayload {
  name: string;
  displayName?: string;
  description: string;
  type: 'media' | 'fonts';
  version: string;
  iconUrl?: string;
  script: string;
  apiVersion: string;
  allowedDomains: Array<string>;
  proxyOptions: {
    forwardedHeaders: boolean;
  };
}

export interface CreateConnectorPayload extends ConnectorPayload {
  enabled: true;
}

export type UpdateConnectorPayload = ConnectorPayload;
