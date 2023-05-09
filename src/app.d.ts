// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import { SupabaseClient, Session } from '@supabase/supabase-js';

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}

		interface Locals {
			supabase: SupabaseClient;
			getSession(): Promise<Session | null>;
		}
		interface PageData {
			session: Session | null;
		}

		interface currentAlgorithm {
			type: 'default' | 'custom' | 'list',
			algorithm?: string,
			list?: object,
		}
	}
}
declare module 'svelte-filepond';

export {};
