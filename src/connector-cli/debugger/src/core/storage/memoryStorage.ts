import type { Storage, StorageKey } from './types';

export class MemoryStorage implements Storage {
  private readonly store = new Map<StorageKey, unknown>();

  getItem<T>(key: StorageKey): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  setItem(key: StorageKey, value: unknown): void {
    this.store.set(key, value);
  }

  removeItem(key: StorageKey): void {
    this.store.delete(key);
  }
}
