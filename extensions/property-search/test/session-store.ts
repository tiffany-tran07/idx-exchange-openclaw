import type { PluginStateSyncKeyedStore } from "openclaw/plugin-sdk/plugin-state-runtime";

export function createMemorySessionStore<T>(): PluginStateSyncKeyedStore<T> {
  const values = new Map<string, T>();
  return {
    register: (key, value) => void values.set(key, value),
    registerIfAbsent: (key, value) => {
      if (values.has(key)) {
        return false;
      }
      values.set(key, value);
      return true;
    },
    update: (key, updateValue) => {
      const value = updateValue(values.get(key));
      if (value === undefined) {
        return values.delete(key);
      }
      values.set(key, value);
      return true;
    },
    deleteIf: (key, predicate) => {
      const value = values.get(key);
      return value === undefined || !predicate(value) ? false : values.delete(key);
    },
    lookup: (key) => values.get(key),
    consume: (key) => {
      const value = values.get(key);
      values.delete(key);
      return value;
    },
    delete: (key) => values.delete(key),
    entries: () => [],
    clear: () => values.clear(),
  };
}
