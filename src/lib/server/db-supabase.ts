import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import type { SessionDb } from './db.js';

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
	if (supabase) return supabase;

	const url = env.SUPABASE_URL;
	const key = env.SUPABASE_ANON_KEY;
	if (!url || !key) {
		throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set for supabase backend');
	}

	supabase = createClient(url, key);
	return supabase;
}

export class SupabaseSessionDb implements SessionDb {
	async getState(key: string): Promise<any | undefined> {
		const { data } = await getClient()
			.from('oauth_state')
			.select('state')
			.eq('key', key)
			.single();
		return data?.state;
	}

	async setState(key: string, state: any): Promise<void> {
		await getClient().from('oauth_state').upsert({
			key,
			state,
			created_at: new Date().toISOString()
		});
	}

	async deleteState(key: string): Promise<void> {
		await getClient().from('oauth_state').delete().eq('key', key);
	}

	async getSession(key: string): Promise<any | undefined> {
		const { data } = await getClient()
			.from('oauth_session')
			.select('session')
			.eq('key', key)
			.single();
		return data?.session;
	}

	async setSession(key: string, session: any): Promise<void> {
		await getClient().from('oauth_session').upsert({
			key,
			session,
			updated_at: new Date().toISOString()
		});
	}

	async deleteSession(key: string): Promise<void> {
		await getClient().from('oauth_session').delete().eq('key', key);
	}

	async getUserSession(
		sessionId: string
	): Promise<{ dids: string[]; primaryDid: string; expiresAt: string; accounts?: { did: string; handle?: string; avatar?: string; displayName?: string }[] } | undefined> {
		let { data } = await getClient()
			.from('user_session')
			.select('dids, primary_did, expires_at, accounts')
			.eq('session_id', sessionId)
			.single();
		if (!data) {
			({ data } = await getClient()
				.from('user_session')
				.select('dids, primary_did, expires_at')
				.eq('session_id', sessionId)
				.single());
		}
		if (!data) return undefined;
		if (new Date(data.expires_at) < new Date()) {
			await getClient().from('user_session').delete().eq('session_id', sessionId);
			return undefined;
		}
		return {
			dids: data.dids,
			primaryDid: data.primary_did,
			expiresAt: data.expires_at,
			accounts: data.accounts || undefined
		};
	}

	async setUserSession(
		sessionId: string,
		data: { dids: string[]; primaryDid: string; expiresAt: string; accounts?: { did: string; handle?: string; avatar?: string; displayName?: string }[] }
	): Promise<void> {
		const row: Record<string, any> = {
			session_id: sessionId,
			dids: data.dids,
			primary_did: data.primaryDid,
			expires_at: data.expiresAt,
		};
		if (data.accounts) row.accounts = data.accounts;
		const { error } = await getClient().from('user_session').upsert(row);
		if (error) {
			await getClient().from('user_session').upsert({
				session_id: sessionId,
				dids: data.dids,
				primary_did: data.primaryDid,
				expires_at: data.expiresAt,
			});
		}
	}

	async deleteUserSession(sessionId: string): Promise<void> {
		await getClient().from('user_session').delete().eq('session_id', sessionId);
	}
}
