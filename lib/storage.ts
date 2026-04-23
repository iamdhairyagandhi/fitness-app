// Safe AsyncStorage wrapper — falls back to in-memory if native module is unavailable
import type AsyncStorageType from '@react-native-async-storage/async-storage';

let _storage: typeof AsyncStorageType;

try {
    _storage = require('@react-native-async-storage/async-storage').default;
    // Quick probe to verify native module is actually linked
    if (!_storage.getItem) throw new Error('invalid');
} catch {
    console.warn('[storage] AsyncStorage native module unavailable — using in-memory fallback');
    const mem = new Map<string, string>();
    _storage = {
        getItem: (key: string) => Promise.resolve(mem.get(key) ?? null),
        setItem: (key: string, value: string) => { mem.set(key, value); return Promise.resolve(); },
        removeItem: (key: string) => { mem.delete(key); return Promise.resolve(); },
        mergeItem: (key: string, value: string) => { mem.set(key, JSON.stringify({ ...JSON.parse(mem.get(key) ?? '{}'), ...JSON.parse(value) })); return Promise.resolve(); },
        clear: () => { mem.clear(); return Promise.resolve(); },
        getAllKeys: () => Promise.resolve([...mem.keys()]),
        multiGet: (keys: string[]) => Promise.resolve(keys.map(k => [k, mem.get(k) ?? null] as [string, string | null])),
        multiSet: (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mem.set(k, v)); return Promise.resolve(); },
        multiRemove: (keys: string[]) => { keys.forEach(k => mem.delete(k)); return Promise.resolve(); },
        multiMerge: (pairs: [string, string][]) => { pairs.forEach(([k, v]) => mem.set(k, v)); return Promise.resolve(); },
    } as any;
}

export default _storage;
