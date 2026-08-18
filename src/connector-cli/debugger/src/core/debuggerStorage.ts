export type StorageKey = string | symbol;

export type DebuggerStorageBackend = {
  getItem: (key: StorageKey) => string | null;
  setItem: (key: StorageKey, value: string) => void;
  removeItem: (key: StorageKey) => void;
};

const SYMBOL_KEY_PREFIX = '@@symbol:';

export function storageKeyToString(key: StorageKey): string {
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

export function createSessionStorageBackend(
  storage: Storage = sessionStorage
): DebuggerStorageBackend {
  return {
    getItem(key) {
      return storage.getItem(storageKeyToString(key));
    },
    setItem(key, value) {
      storage.setItem(storageKeyToString(key), value);
    },
    removeItem(key) {
      storage.removeItem(storageKeyToString(key));
    },
  };
}

export function createMemoryStorageBackend(): DebuggerStorageBackend {
  const map = new Map<StorageKey, string>();
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

let backend: DebuggerStorageBackend = createSessionStorageBackend();

export function setDebuggerStorageBackend(next: DebuggerStorageBackend) {
  backend = next;
}

export function getItem(key: StorageKey): string | null {
  return backend.getItem(key);
}

export function setItem(key: StorageKey, value: string): void {
  backend.setItem(key, value);
}

export function removeItem(key: StorageKey): void {
  backend.removeItem(key);
}

export function getJson<T>(key: StorageKey): T | undefined {
  const raw = getItem(key);
  if (raw == null) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function setJson(key: StorageKey, value: unknown): void {
  setItem(key, JSON.stringify(value));
}
