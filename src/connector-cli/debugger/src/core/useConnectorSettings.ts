import { useCallback, useState } from 'react';
import { Header } from '../helpers/connectorRuntime';
import {
  HttpParamsValues,
  readInitialSettings,
  httpParamsStorageKey,
  runtimeOptionsStorageKey,
  settingsStorage,
  UpdateSettingsFn,
} from './connectorSettingsStorage';

export function useConnectorSettings() {
  const [initialSettings] = useState(readInitialSettings);
  const [globalHeaders, setGlobalHeaders] = useState<Header[]>(
    initialSettings.httpParams.globalHeaders
  );
  const [authorization, setAuthorization] = useState(
    initialSettings.httpParams.authorization
  );
  const [runtimeOptions, setRuntimeOptions] = useState<Record<string, unknown>>(
    initialSettings.runtimeOptions
  );
  const [globalQueryParams, setGlobalQueryParams] = useState<URLSearchParams>(
    initialSettings.httpParams.globalQueryParams
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

        settingsStorage.setItem(httpParamsStorageKey, [
          auth ?? '',
          httpHeaders ?? {},
          httpQuery ?? {},
        ]);
        break;
      }
      case 'runtime-options': {
        const [options] = values as [Record<string, unknown> | undefined];
        setRuntimeOptions(options ?? {});
        settingsStorage.setItem(runtimeOptionsStorageKey, values);
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
