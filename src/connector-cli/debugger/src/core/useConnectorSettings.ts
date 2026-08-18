import { useCallback, useState } from 'react';
import { Header } from '../Helpers/ConnectorRuntime';
import { getJson, setJson } from './debuggerStorage';

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

export const httpParamsStorageKey = Symbol.for('connector-cli-http-params-v2');
export const runtimeOptionsStorageKey = Symbol.for(
  'connector-cli-runtime-options'
);

function readStoredHttpParams(): {
  authorization: string;
  globalHeaders: Header[];
  globalQueryParams: URLSearchParams;
} {
  const stored = getJson<HttpParamsValues>(httpParamsStorageKey);
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

function readStoredRuntimeOptions(): Record<string, unknown> {
  const stored = getJson<[Record<string, unknown> | undefined]>(
    runtimeOptionsStorageKey
  );
  return stored?.[0] ?? {};
}

function readInitialSettings() {
  const httpParams = readStoredHttpParams();
  return {
    ...httpParams,
    runtimeOptions: readStoredRuntimeOptions(),
  };
}

// Responsible to store, update and read data of "Configuration" section items
export function useConnectorSettings() {
  const [initialSettings] = useState(readInitialSettings);
  const [globalHeaders, setGlobalHeaders] = useState<Header[]>(
    initialSettings.globalHeaders
  );
  const [authorization, setAuthorization] = useState(
    initialSettings.authorization
  );
  const [runtimeOptions, setRuntimeOptions] = useState<Record<string, unknown>>(
    initialSettings.runtimeOptions
  );
  const [globalQueryParams, setGlobalQueryParams] = useState<URLSearchParams>(
    initialSettings.globalQueryParams
  );

  const updateSettings: UpdateSettingsFn = useCallback((name, values) => {
    switch (name) {
      case 'http-params': {
        // Switch on `name` does not narrow sibling `values` (correlated params).
        const [auth, httpHeaders, httpQuery] = values as HttpParamsValues;
        setAuthorization(auth ?? '');
        setGlobalHeaders(
          Object.entries(httpHeaders ?? {}).map(([headerName, value]) => ({
            name: headerName,
            value,
          }))
        );
        setGlobalQueryParams(new URLSearchParams(httpQuery));

        setJson(httpParamsStorageKey, [
          auth ?? '',
          httpHeaders ?? {},
          httpQuery ?? {},
        ]);
        break;
      }
      case 'runtime-options': {
        const [options] = values as [Record<string, unknown> | undefined];
        setRuntimeOptions(options ?? {});
        setJson(runtimeOptionsStorageKey, values);
      }
    }
  }, []);

  return {
    globalHeaders,
    authorization,
    runtimeOptions,
    globalQueryParams,
    updateSettings,
  };
}
