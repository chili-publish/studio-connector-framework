import { useCallback, useState } from 'react';
import { Header } from '../Helpers/ConnectorRuntime';

export type UpdateConfigurationHttpParams = (
  name: 'http-params',
  [headers, queryParams]: [
    (
      | { authorization: unknown | undefined; other: unknown | undefined }
      | undefined
    ),
    Record<string, string> | undefined,
  ]
) => void;
export type UpdateConfigurationRuntimeOptions = (
  name: 'options',
  values: [Record<string, unknown>]
) => void;

export type UpdateConfigurationFn = UpdateConfigurationHttpParams &
  UpdateConfigurationRuntimeOptions;

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

  const updateConfiguration = useCallback(
    (
      name: 'http-params' | 'options',
      value:
        | Parameters<UpdateConfigurationHttpParams>[1]
        | Parameters<UpdateConfigurationRuntimeOptions>[1]
    ) => {
      switch (name) {
        case 'http-params':
          const [headers, queryParams] =
            value as Parameters<UpdateConfigurationHttpParams>[1];
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

          sessionStorage.setItem(httpParamsStorageKey, JSON.stringify(value));
          break;
        case 'options': {
          const val = value as Parameters<UpdateConfigurationRuntimeOptions>[1];
          setRuntimeOptions(val[0]);
          sessionStorage.setItem(
            runtimeOptionsStorageKey,
            JSON.stringify(value)
          );
        }
      }
    },
    []
  );

  const initConfiguration = useCallback(() => {
    if (!!sessionStorage.getItem(runtimeOptionsStorageKey)) {
      updateConfiguration(
        'options',
        JSON.parse(sessionStorage.getItem(runtimeOptionsStorageKey)!)
      );
    }
    if (!!sessionStorage.getItem(httpParamsStorageKey)) {
      updateConfiguration(
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
    updateConfiguration,
    initConfiguration,
  };
}
