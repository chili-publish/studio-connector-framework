export interface ProxyOptions {
  allowedDomains: Array<string>;
  forwardedHeaders: true;
}

interface ConnectorPayload {
  name: string;
  description: string;
  type: 'media' | 'fonts';
  version: string;
  iconUrl?: string;
  script: string;
  apiVersion: string;
  options?: Record<string, unknown>;
  allowedDomains: Array<string>;
  proxyOptions: {
    forwardedHeaders: boolean;
  };
}

export interface CreateConnectorPayload extends ConnectorPayload {
  enabled: true;
}

export type UpdateConnectorPayload = ConnectorPayload;
