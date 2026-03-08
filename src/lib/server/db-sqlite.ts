import Database from 'better-sqlite3';
import { resolve } from 'path';
import type { SessionDb } from './db.js';

const DB_PATH = resolve('.data/sessions.db');

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
	if (db) return db;

	db = new Database(DB_PATH);
	db.pragma('journal_mode = WAL');

	db.exec(`
		CREATE TABLE IF NOT EXISTS oauth_state (
			key TEXT PRIMARY KEY,
			state TEXT NOT NULL,
			created_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS oauth_session (
			key TEXT PRIMARY KEY,
			session TEXT NOT NULL,
			created_at TEXT DEFAULT (datetime('now')),
			updated_at TEXT DEFAULT (datetime('now'))
		);

		CREATE TABLE IF NOT EXISTS user_session (
			session_id TEXT PRIMARY KEY,
			dids TEXT NOT NULL,
			primary_did TEXT NOT NULL,
			created_at TEXT DEFAULT (datetime('now')),
			expires_at TEXT NOT NULL
		);

	`);

	try { db.exec('ALTER TABLE user_session ADD COLUMN accounts TEXT'); } catch {}

	return db;
}

export class SqliteSessionDb implements SessionDb {
	async getState(key: string): Promise<any | undefined> {
		const row = getDatabase()
			.prepare('SELECT state FROM oauth_state WHERE key = ?')
			.get(key) as { state: string } | undefined;
		return row ? JSON.parse(row.state) : undefined;
	}

	async setState(key: string, state: any): Promise<void> {
		getDatabase()
			.prepare(
				'INSERT OR REPLACE INTO oauth_state (key, state, created_at) VALUES (?, ?, datetime(\'now\'))'
			)
			.run(key, JSON.stringify(state));
	}

	async deleteState(key: string): Promise<void> {
		getDatabase().prepare('DELETE FROM oauth_state WHERE key = ?').run(key);
	}

	async getSession(key: string): Promise<any | undefined> {
		const row = getDatabase()
			.prepare('SELECT session FROM oauth_session WHERE key = ?')
			.get(key) as { session: string } | undefined;
		return row ? JSON.parse(row.session) : undefined;
	}

	async setSession(key: string, session: any): Promise<void> {
		getDatabase()
			.prepare(
				'INSERT OR REPLACE INTO oauth_session (key, session, updated_at) VALUES (?, ?, datetime(\'now\'))'
			)
			.run(key, JSON.stringify(session));
	}

	async deleteSession(key: string): Promise<void> {
		getDatabase().prepare('DELETE FROM oauth_session WHERE key = ?').run(key);
	}

	async getUserSession(
		sessionId: string
	): Promise<{ dids: string[]; primaryDid: string; expiresAt: string; accounts?: { did: string; handle?: string; avatar?: string; displayName?: string }[] } | undefined> {
		const row = getDatabase()
			.prepare('SELECT dids, primary_did, expires_at, accounts FROM user_session WHERE session_id = ?')
			.get(sessionId) as { dids: string; primary_did: string; expires_at: string; accounts: string | null } | undefined;
		if (!row) return undefined;
		if (new Date(row.expires_at) < new Date()) {
			getDatabase().prepare('DELETE FROM user_session WHERE session_id = ?').run(sessionId);
			return undefined;
		}
		return {
			dids: JSON.parse(row.dids),
			primaryDid: row.primary_did,
			expiresAt: row.expires_at,
			accounts: row.accounts ? JSON.parse(row.accounts) : undefined
		};
	}

	async setUserSession(
		sessionId: string,
		data: { dids: string[]; primaryDid: string; expiresAt: string; accounts?: { did: string; handle?: string; avatar?: string; displayName?: string }[] }
	): Promise<void> {
		getDatabase()
			.prepare(
				'INSERT OR REPLACE INTO user_session (session_id, dids, primary_did, expires_at, accounts) VALUES (?, ?, ?, ?, ?)'
			)
			.run(sessionId, JSON.stringify(data.dids), data.primaryDid, data.expiresAt, data.accounts ? JSON.stringify(data.accounts) : null);
	}

	async deleteUserSession(sessionId: string): Promise<void> {
		getDatabase().prepare('DELETE FROM user_session WHERE session_id = ?').run(sessionId);
	}
}
