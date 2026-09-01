import type { HttpParams } from '../helpers/connectorRuntime';
import { SessionStorage } from './storage';

export type HttpParamsValues = [
  string | undefined,
  Record<string, string> | undefined,
  Record<string, string> | undefined,
];

export type UpdateHttpParamsSettings = (
  name: 'http-params',
  values: HttpParamsValues
) => void;
export type UpdateRuntimeOptionsSettings = (
  name: 'runtime-options',
  values: [Record<string, unknown> | undefined]
) => void;

export type UpdateSettingsFn = UpdateHttpParamsSettings &
  UpdateRuntimeOptionsSettings;

/** Session-backed — HTTP params and runtime options only. */
export const settingsStorage = new SessionStorage();

export function httpParamsStorageKey(connectorName: string) {
  return Symbol.for(`connector-cli-http-params:${connectorName}`);
}

export function runtimeOptionsStorageKey(connectorName: string) {
  return Symbol.for(`connector-cli-runtime-options:${connectorName}`);
}

export function readStoredHttpParams(connectorName: string): HttpParams {
  const stored = settingsStorage.getItem<HttpParamsValues>(
    httpParamsStorageKey(connectorName)
  );
  if (!stored) {
    return {
      authorization: '',
      globalHeaders: [],
      globalQueryParams: new URLSearchParams(),
    };
  }

  const [auth, httpHeaders, httpQuery] = stored;
  return {
    authorization: auth ?? '',
    globalHeaders: Object.entries(httpHeaders ?? {}).map(
      ([headerName, value]) => ({
        name: headerName,
        value,
      })
    ),
    globalQueryParams: new URLSearchParams(httpQuery),
  };
}

export function readStoredRuntimeOptions(
  connectorName: string
): Record<string, unknown> {
  const stored = settingsStorage.getItem<[Record<string, unknown> | undefined]>(
    runtimeOptionsStorageKey(connectorName)
  );
  return stored?.[0] ?? {};
}

export function readInitialSettings(connectorName: string) {
  return {
    httpParams: readStoredHttpParams(connectorName),
    runtimeOptions: readStoredRuntimeOptions(connectorName),
  };
}
