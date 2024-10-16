import { useCallback, useState } from 'react';
import { Header } from '../Helpers/ConnectorRuntime';

export type UpdateHttpParamsSettings = (
  name: 'http-params',
  [headers, queryParams]: [
    (
      | { authorization: unknown | undefined; other: unknown | undefined }
      | undefined
    ),
    Record<string, string> | undefined,
  ]
) => void;
export type UpdateRuntimeOptionsSettings = (
  name: 'runtime-options',
  values: [Record<string, unknown> | undefined]
) => void;

export type UpdateSettingsFn = UpdateHttpParamsSettings &
  UpdateRuntimeOptionsSettings;

const httpParamsStorageKey = 'connector-cli-http-params';
const runtimeOptionsStorageKey = 'connector-cli-runtime-options';

// Responsible to store, update and read data of "Configuration" section items
export function useConnectorSettings() {
  const [globalHeaders, setGlobalHeaders] = useState<Header[]>([]);
  const [authorization, setAuthorization] = useState<Header>({} as any);
  const [runtimeOptions, setRuntimeOptions] = useState<Record<string, unknown>>(
    {}
  );
  const [globalQueryParams, setGlobalQueryParams] = useState<URLSearchParams>(
    new URLSearchParams()
  );

  const updateSettings: UpdateSettingsFn = useCallback((name, values) => {
    switch (name) {
      case 'http-params':
        const [headers, queryParams] = values;
        setAuthorization({
          name: Object.keys(headers?.authorization ?? {})[0],
          value: Object.values(headers?.authorization ?? {})[0],
        });
        setGlobalHeaders(
          Object.entries(headers?.other ?? {}).map((h) => ({
            name: h[0],
            value: h[1],
          }))
        );
        setGlobalQueryParams(new URLSearchParams(queryParams));

        sessionStorage.setItem(httpParamsStorageKey, JSON.stringify(values));
        break;
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
        JSON.parse(sessionStorage.getItem(httpParamsStorageKey)!)
      );
    }
  }, []);

  return {
    globalHeaders,
    authorization,
    runtimeOptions,
    globalQueryParams,
    updateSettings,
    initSettings,
  };
}
