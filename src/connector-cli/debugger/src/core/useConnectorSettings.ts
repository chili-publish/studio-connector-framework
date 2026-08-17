import { useCallback, useState } from 'react';
import { Header } from '../Helpers/ConnectorRuntime';

export type UpdateHttpParamsSettings = (
  name: 'http-params',
  values: [
    string | undefined,
    Record<string, string> | undefined,
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

function authorizationFromStored(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>);
    const first = values[0];
    return typeof first === 'string' ? first : '';
  }
  return '';
}

/** Migrate legacy `[ { authorization, other }, query ]` to flat tuple. */
function normalizeHttpParamsStorage(
  stored: unknown
): [
  string | undefined,
  Record<string, string> | undefined,
  Record<string, string> | undefined,
] {
  if (!Array.isArray(stored) || stored.length === 0) {
    return [undefined, undefined, undefined];
  }

  const [first, second, third] = stored;

  // Legacy: [{ authorization, other }, query]
  if (
    first &&
    typeof first === 'object' &&
    !Array.isArray(first) &&
    ('authorization' in first || 'other' in first)
  ) {
    const legacy = first as {
      authorization?: unknown;
      other?: Record<string, string>;
    };
    return [
      authorizationFromStored(legacy.authorization),
      legacy.other,
      second as Record<string, string> | undefined,
    ];
  }

  return [
    authorizationFromStored(first),
    second as Record<string, string> | undefined,
    third as Record<string, string> | undefined,
  ];
}

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
        const [auth, httpHeaders, httpQuery] =
          normalizeHttpParamsStorage(values);
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
        normalizeHttpParamsStorage(
          JSON.parse(sessionStorage.getItem(httpParamsStorageKey)!)
        )
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
