import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore
} from '@atproto/oauth-client-node';
import type { SessionDb } from './db.js';

export class DbSessionStore implements NodeSavedSessionStore {
	constructor(private db: SessionDb) {}

	async get(key: string): Promise<NodeSavedSession | undefined> {
		return this.db.getSession(key);
	}

	async set(key: string, val: NodeSavedSession): Promise<void> {
		await this.db.setSession(key, val);
	}

	async del(key: string): Promise<void> {
		await this.db.deleteSession(key);
	}
}

export class DbStateStore implements NodeSavedStateStore {
	constructor(private db: SessionDb) {}

	async get(key: string): Promise<NodeSavedState | undefined> {
		return this.db.getState(key);
	}

	async set(key: string, val: NodeSavedState): Promise<void> {
		await this.db.setState(key, val);
	}

	async del(key: string): Promise<void> {
		await this.db.deleteState(key);
	}
}
