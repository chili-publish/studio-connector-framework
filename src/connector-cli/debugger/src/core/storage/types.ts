export type StorageKey = string | symbol;

export interface Storage {
  getItem<T>(key: StorageKey): T | undefined;
  setItem(key: StorageKey, value: unknown): void;
  removeItem(key: StorageKey): void;
}
