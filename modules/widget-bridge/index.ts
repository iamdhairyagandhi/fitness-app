import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class WidgetBridgeNativeModule extends NativeModule {
    setSnapshot(suite: string, key: string, jsonValue: string): boolean;
    clearSnapshot(suite: string, key: string): boolean;
    reloadAll(): void;
    reloadKind(kind: string): void;
    isAvailable(): boolean;
}

const NativeWidgetBridge = requireOptionalNativeModule<WidgetBridgeNativeModule>('WidgetBridgeModule');

const noop = {
    setSnapshot: () => false,
    clearSnapshot: () => false,
    reloadAll: () => {},
    reloadKind: () => {},
    isAvailable: () => false,
};

const impl: Pick<WidgetBridgeNativeModule, 'setSnapshot' | 'clearSnapshot' | 'reloadAll' | 'reloadKind' | 'isAvailable'> =
    NativeWidgetBridge ?? noop;

export const WidgetBridge = {
    /**
     * Persist a JSON-encoded snapshot to the shared App Group UserDefaults so
     * the iOS widget extension can read it. Returns true on success.
     */
    setSnapshot(suite: string, key: string, jsonValue: string): boolean {
        try {
            return impl.setSnapshot(suite, key, jsonValue);
        } catch {
            return false;
        }
    },

    /** Remove the snapshot for a given key (e.g. on logout). */
    clearSnapshot(suite: string, key: string): boolean {
        try {
            return impl.clearSnapshot(suite, key);
        } catch {
            return false;
        }
    },

    /** Ask WidgetKit to reload every widget timeline owned by this app. */
    reloadAll(): void {
        try {
            impl.reloadAll();
        } catch {
            // Silently ignore on platforms where the native module is missing.
        }
    },

    /** Reload a single widget kind (matches the `kind` registered in Swift). */
    reloadKind(kind: string): void {
        try {
            impl.reloadKind(kind);
        } catch {
            // Silently ignore on platforms where the native module is missing.
        }
    },

    /** True when the native module is present (iOS dev/prod build, not Expo Go). */
    isAvailable(): boolean {
        try {
            return impl.isAvailable();
        } catch {
            return false;
        }
    },
};

export default WidgetBridge;
