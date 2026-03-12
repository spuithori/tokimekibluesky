import type { StoredSession, StoredState } from './types';

const DB_NAME = 'tokimeki-oauth';
const DB_VERSION = 1;

const STORE_SESSIONS = 'sessions';
const STORE_STATES = 'states';
const STORE_DPOP_NONCES = 'dpop-nonces';

const STATE_TTL = 10 * 60 * 1000; // 10 minutes

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
                db.createObjectStore(STORE_SESSIONS, { keyPath: 'did' });
            }
            if (!db.objectStoreNames.contains(STORE_STATES)) {
                db.createObjectStore(STORE_STATES, { keyPath: 'state' });
            }
            if (!db.objectStoreNames.contains(STORE_DPOP_NONCES)) {
                db.createObjectStore(STORE_DPOP_NONCES);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function tx<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
    return openDb().then(
        (db) =>
            new Promise((resolve, reject) => {
                const txn = db.transaction(storeName, mode);
                const store = txn.objectStore(storeName);
                const req = fn(store);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            }),
    );
}

// --- Sessions ---

export function getSession(did: string): Promise<StoredSession | undefined> {
    return tx(STORE_SESSIONS, 'readonly', (s) => s.get(did));
}

export function putSession(session: StoredSession): Promise<IDBValidKey> {
    return tx(STORE_SESSIONS, 'readwrite', (s) => s.put(session));
}

export function deleteSession(did: string): Promise<undefined> {
    return tx(STORE_SESSIONS, 'readwrite', (s) => s.delete(did));
}

// --- Auth flow states ---

export function getState(state: string): Promise<StoredState | undefined> {
    return tx(STORE_STATES, 'readonly', (s) => s.get(state));
}

export function putState(stored: StoredState): Promise<IDBValidKey> {
    return tx(STORE_STATES, 'readwrite', (s) => s.put(stored));
}

export function deleteState(state: string): Promise<undefined> {
    return tx(STORE_STATES, 'readwrite', (s) => s.delete(state));
}

export async function cleanupExpiredStates(): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const txn = db.transaction(STORE_STATES, 'readwrite');
        const store = txn.objectStore(STORE_STATES);
        const req = store.openCursor();
        const now = Date.now();
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                const stored = cursor.value as StoredState;
                if (now - stored.timestamp > STATE_TTL) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                resolve();
            }
        };
        req.onerror = () => reject(req.error);
    });
}

// --- DPoP nonces ---

export function getDPoPNonce(origin: string): Promise<string | undefined> {
    return tx(STORE_DPOP_NONCES, 'readonly', (s) => s.get(origin));
}

export function putDPoPNonce(origin: string, nonce: string): Promise<IDBValidKey> {
    return tx(STORE_DPOP_NONCES, 'readwrite', (s) => s.put(nonce, origin));
}
