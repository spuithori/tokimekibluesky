// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}

		interface currentAlgorithm {
			type: 'default' | 'custom' | 'list',
			algorithm?: string,
			list?: object,
		}
	}

	type TranslatorAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

	interface TranslatorCreateMonitor {
		addEventListener(type: 'downloadprogress', listener: (event: { loaded: number }) => void): void;
	}

	interface TranslatorCreateOptions {
		sourceLanguage: string;
		targetLanguage: string;
		signal?: AbortSignal;
		monitor?: (monitor: TranslatorCreateMonitor) => void;
	}

	interface Translator {
		translate(input: string): Promise<string>;
		translateStreaming(input: string): ReadableStream;
		measureInputUsage(input: string): Promise<number>;
		readonly inputQuota: number;
		readonly sourceLanguage: string;
		readonly targetLanguage: string;
		destroy(): void;
	}

	var Translator: {
		availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorAvailability>;
		create(options: TranslatorCreateOptions): Promise<Translator>;
	};
}
declare module 'svelte-filepond';

export {};
