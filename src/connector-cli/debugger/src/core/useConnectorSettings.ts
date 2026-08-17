import { useCallback, useState } from 'react';
import { Header } from '../Helpers/ConnectorRuntime';

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

/** New key — ignores legacy `connector-cli-http-params` shape. */
const httpParamsStorageKey = 'connector-cli-http-params-v2';
const runtimeOptionsStorageKey = 'connector-cli-runtime-options';

// Responsible to store, update and read data of "Configuration" section items
export function useConnectorSettings() {
  const [globalHeaders, setGlobalHeaders] = useState<Header[]>([]);
  const [authorization, setAuthorization] = useState('');
  const [runtimeOptions, setRuntimeOptions] = useState<Record<string, unknown>>(
    {}
  );
  const [globalQueryParams, setGlobalQueryParams] = useState<URLSearchParams>(
    new URLSearchParams()
  );

  const updateSettings: UpdateSettingsFn = useCallback((name, values) => {
    switch (name) {
      case 'http-params': {
        const [auth, httpHeaders, httpQuery] = values;
        setAuthorization(auth ?? '');
        setGlobalHeaders(
          Object.entries(httpHeaders ?? {}).map(([headerName, value]) => ({
            name: headerName,
            value,
          }))
        );
        setGlobalQueryParams(new URLSearchParams(httpQuery));

        sessionStorage.setItem(
          httpParamsStorageKey,
          JSON.stringify([auth ?? '', httpHeaders ?? {}, httpQuery ?? {}])
        );
        break;
      }
      case 'runtime-options': {
        const val = values;
        setRuntimeOptions(val[0] ?? {});
        sessionStorage.setItem(
          runtimeOptionsStorageKey,
          JSON.stringify(values)
        );
      }
    }
  }, []);

  const initSettings = useCallback(() => {
    if (!!sessionStorage.getItem(runtimeOptionsStorageKey)) {
      updateSettings(
        'runtime-options',
        JSON.parse(sessionStorage.getItem(runtimeOptionsStorageKey)!)
      );
    }
    if (!!sessionStorage.getItem(httpParamsStorageKey)) {
      updateSettings(
        'http-params',
        JSON.parse(sessionStorage.getItem(httpParamsStorageKey)!) as HttpParamsValues
      );
    }
  }, [updateSettings]);

  return {
    globalHeaders,
    authorization,
    runtimeOptions,
    globalQueryParams,
    updateSettings,
    initSettings,
  };
}
