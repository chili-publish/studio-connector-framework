class ConnectorHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ConnectorHttpError';
    Object.setPrototypeOf(this, ConnectorHttpError.prototype);
  }
}

export function initRuntimeErrors() {
  (window as any)['ConnectorHttpError'] = ConnectorHttpError;
}
