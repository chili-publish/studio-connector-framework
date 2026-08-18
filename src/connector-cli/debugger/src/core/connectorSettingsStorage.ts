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

export const httpParamsStorageKey = Symbol.for('connector-cli-http-params-v2');
export const runtimeOptionsStorageKey = Symbol.for(
  'connector-cli-runtime-options'
);

export function readStoredHttpParams(): HttpParams {
  const stored = settingsStorage.getItem<HttpParamsValues>(httpParamsStorageKey);
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

export function readStoredRuntimeOptions(): Record<string, unknown> {
  const stored = settingsStorage.getItem<[Record<string, unknown> | undefined]>(
    runtimeOptionsStorageKey
  );
  return stored?.[0] ?? {};
}

export function readInitialSettings() {
  return {
    httpParams: readStoredHttpParams(),
    runtimeOptions: readStoredRuntimeOptions(),
  };
}
