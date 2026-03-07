export interface SessionDb {
	getState(key: string): Promise<any | undefined>;
	setState(key: string, state: any): Promise<void>;
	deleteState(key: string): Promise<void>;

	getSession(key: string): Promise<any | undefined>;
	setSession(key: string, session: any): Promise<void>;
	deleteSession(key: string): Promise<void>;

	getUserSession(
		sessionId: string
	): Promise<{ dids: string[]; primaryDid: string; expiresAt: string } | undefined>;
	setUserSession(
		sessionId: string,
		data: { dids: string[]; primaryDid: string; expiresAt: string }
	): Promise<void>;
	deleteUserSession(sessionId: string): Promise<void>;

	getPasswordSession(
		did: string
	): Promise<{ accessJwt: string; refreshJwt: string; did: string; handle: string; service: string } | undefined>;
	setPasswordSession(
		did: string,
		data: { accessJwt: string; refreshJwt: string; did: string; handle: string; service: string }
	): Promise<void>;
	deletePasswordSession(did: string): Promise<void>;
}

import { env } from '$env/dynamic/private';

let dbInstance: SessionDb | null = null;

export async function getDb(): Promise<SessionDb> {
	if (dbInstance) return dbInstance;

	const backend = env.SESSION_DB_BACKEND || 'sqlite';

	if (backend === 'supabase') {
		const { SupabaseSessionDb } = await import('./db-supabase.js');
		dbInstance = new SupabaseSessionDb();
	} else {
		const { SqliteSessionDb } = await import('./db-sqlite.js');
		dbInstance = new SqliteSessionDb();
	}

	return dbInstance;
}
