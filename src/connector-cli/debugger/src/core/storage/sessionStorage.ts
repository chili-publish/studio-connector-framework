import type { Storage, StorageKey } from './types';

const SYMBOL_KEY_PREFIX = '@@symbol:';

function storageKeyToString(key: StorageKey): string {
  if (typeof key === 'string') {
    return key;
  }

  const registeredKey = Symbol.keyFor(key);
  if (registeredKey !== undefined) {
    return registeredKey;
  }

  const description = key.description;
  if (!description) {
    throw new Error(
      'Anonymous symbols without a description cannot be used as storage keys'
    );
  }

  return `${SYMBOL_KEY_PREFIX}${description}`;
}

export class SessionStorage implements Storage {
  constructor(
    private readonly webStorage: globalThis.Storage = sessionStorage
  ) {}

  getItem<T>(key: StorageKey): T | undefined {
    const raw = this.webStorage.getItem(storageKeyToString(key));
    if (raw == null) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  setItem(key: StorageKey, value: unknown): void {
    this.webStorage.setItem(storageKeyToString(key), JSON.stringify(value));
  }

  removeItem(key: StorageKey): void {
    this.webStorage.removeItem(storageKeyToString(key));
  }
}
