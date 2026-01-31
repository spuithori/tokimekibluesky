import { Database } from 'bun:sqlite';
import { building } from '$app/environment';
import path from 'path';

// Don't initialize DB during build
const db = building ? null : new Database(
  path.join(process.cwd(), 'data', 'lastread.db')
);

// Initialize schema
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS last_read (
      did TEXT NOT NULL,
      column_id TEXT NOT NULL,
      uri TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (did, column_id)
    )
  `);
}

export function getLastRead(did: string, columnId: string): string | null {
  if (!db) return null;
  const row = db.prepare(
    'SELECT uri FROM last_read WHERE did = ? AND column_id = ?'
  ).get(did, columnId) as { uri: string } | undefined;
  return row?.uri ?? null;
}

export function setLastRead(did: string, columnId: string, uri: string): void {
  if (!db) return;
  db.prepare(`
    INSERT INTO last_read (did, column_id, uri, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(did, column_id) DO UPDATE SET
      uri = excluded.uri,
      updated_at = excluded.updated_at
  `).run(did, columnId, uri);
}

export function getAllLastRead(did: string): Record<string, string> {
  if (!db) return {};
  const rows = db.prepare(
    'SELECT column_id, uri FROM last_read WHERE did = ?'
  ).all(did) as { column_id: string; uri: string }[];
  return Object.fromEntries(rows.map(r => [r.column_id, r.uri]));
}
