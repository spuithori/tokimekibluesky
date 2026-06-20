/**
 * Storage abstraction for settings. Today only LocalStoragePersistence exists,
 * but the interface is the single seam through which all settings reads/writes
 * pass — a future CloudPersistence (OAuth / custom AppView via
 * agent.callWithProxy('tech.tokimeki.settings.*') or app.bsky.actor
 * .putPreferences) drops in here without touching the store or UI.
 */

export type SettingsScope = 'global' | { account: string };

export interface SettingsPersistence {
    read(scope: SettingsScope): unknown;
    write(scope: SettingsScope, value: unknown): void;
    /**
     * Cloud sync seam (not used yet). A future CloudPersistence — OAuth → custom
     * AppView via agent.callWithProxy('tech.tokimeki.settings.*'), or
     * app.bsky.actor.getPreferences/putPreferences for account-scoped values —
     * implements remote pull/flush here. The store reads synchronously from
     * local storage today; a cloud layer hydrates over it. LocalStoragePersistence
     * leaves these undefined.
     */
    pull?(scope: SettingsScope): Promise<unknown>;
    flush?(scope: SettingsScope, value: unknown): Promise<void>;
}

function storageKey(scope: SettingsScope): string {
    // 'global' keeps the historical 'settings' key for backward compatibility.
    return scope === 'global' ? 'settings' : `settings:${scope.account}`;
}

export class LocalStoragePersistence implements SettingsPersistence {
    read(scope: SettingsScope): unknown {
        try {
            const raw = localStorage.getItem(storageKey(scope));
            return raw ? JSON.parse(raw) : undefined;
        } catch (e) {
            console.error('Failed to read settings from localStorage', e);
            return undefined;
        }
    }

    write(scope: SettingsScope, value: unknown): void {
        try {
            localStorage.setItem(storageKey(scope), JSON.stringify(value));
        } catch (e) {
            console.error('Failed to write settings to localStorage', e);
        }
    }
}

export const persistence: SettingsPersistence = new LocalStoragePersistence();
