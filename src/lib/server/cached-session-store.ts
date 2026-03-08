import type {
	NodeSavedSession,
	NodeSavedSessionStore
} from '@atproto/oauth-client-node';
import { getRuntimeCache } from './runtime-cache.js';

const SESSION_TTL = 300; // 5 minutes

export class CachedSessionStore implements NodeSavedSessionStore {
	constructor(private inner: NodeSavedSessionStore) {}

	async get(key: string): Promise<NodeSavedSession | undefined> {
		const cache = getRuntimeCache();
		if (cache) {
			try {
				const cached = await cache.get(`oauth_session:${key}`);
				if (cached) return cached as NodeSavedSession;
			} catch {}
		}

		const val = await this.inner.get(key);

		if (val && cache) {
			try {
				await cache.set(`oauth_session:${key}`, val, { ttl: SESSION_TTL });
			} catch {}
		}

		return val;
	}

	async set(key: string, val: NodeSavedSession): Promise<void> {
		await this.inner.set(key, val);

		const cache = getRuntimeCache();
		if (cache) {
			try {
				await cache.set(`oauth_session:${key}`, val, { ttl: SESSION_TTL });
			} catch {}
		}
	}

	async del(key: string): Promise<void> {
		await this.inner.del(key);

		const cache = getRuntimeCache();
		if (cache) {
			try {
				await cache.delete(`oauth_session:${key}`);
			} catch {}
		}
	}
}
