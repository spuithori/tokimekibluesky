import { getCache } from '@vercel/functions';

export interface RuntimeCache {
	get: (key: string) => Promise<unknown | null>;
	set: (key: string, value: unknown, options?: { ttl?: number; tags?: string[] }) => Promise<void>;
	delete: (key: string) => Promise<void>;
	expireTag: (tag: string | string[]) => Promise<void>;
}

let _cache: RuntimeCache | null = null;
let _initialized = false;

export function getRuntimeCache(): RuntimeCache | null {
	if (_initialized) return _cache;
	_initialized = true;
	try {
		_cache = getCache();
	} catch {
		_cache = null;
	}
	return _cache;
}
