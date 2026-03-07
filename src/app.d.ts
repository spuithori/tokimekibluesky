// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				sessionId: string;
				dids: string[];
				primaryDid: string;
			};
		}
		// interface PageData {}
		// interface Platform {}

		interface currentAlgorithm {
			type: 'default' | 'custom' | 'list',
			algorithm?: string,
			list?: object,
		}
	}
}
declare module 'svelte-filepond';

export {};
