// Lightweight XRPC client that accepts a FetchHandler

export type FetchHandler = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface XrpcCallOptions {
	headers?: Record<string, string>;
	signal?: AbortSignal;
	encoding?: string;
}

export class XrpcClient {
	private _fetch: FetchHandler;
	private _labelerDids: string[] = [];
	private _inflight = new Map<string, Promise<any>>();

	constructor(fetchHandler: FetchHandler) {
		this._fetch = fetchHandler;
	}

	configureLabelers(dids: string[]): void {
		this._labelerDids = dids;
	}

	async get<T = any>(nsid: string, params?: Record<string, any>, opts?: XrpcCallOptions): Promise<T> {
		const queryParts: string[] = [];
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value === undefined || value === null) continue;
				if (Array.isArray(value)) {
					for (const v of value) {
						queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
					}
				} else {
					queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
				}
			}
		}

		const query = queryParts.length ? `?${queryParts.join('&')}` : '';
		const path = `/xrpc/${nsid}${query}`;

		const headers: Record<string, string> = { ...opts?.headers };
		if (this._labelerDids.length) {
			headers['atproto-accept-labelers'] = this._labelerDids.map(d => `${d};redact`).join(', ');
		}

		const res = await this._fetch(path, {
			method: 'GET',
			headers,
			signal: opts?.signal,
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			const err: any = new Error(body.message || `XRPC ${nsid} failed: ${res.status}`);
			err.status = res.status;
			err.error = body.error;
			throw err;
		}

		const contentType = res.headers.get('content-type');
		if (contentType?.includes('application/json') || !contentType) {
			return await res.json();
		}
		return await res.arrayBuffer() as any;
	}

	async getDeduped<T = any>(nsid: string, params?: Record<string, any>, opts?: XrpcCallOptions): Promise<T> {
		const key = nsid + JSON.stringify(params || {});

		const existing = this._inflight.get(key);
		if (existing) {
			return existing;
		}

		const promise = this.get<T>(nsid, params, opts).finally(() => {
			this._inflight.delete(key);
		});
		this._inflight.set(key, promise);
		return promise;
	}

	async post<T = any>(nsid: string, data?: unknown, opts?: XrpcCallOptions): Promise<T> {
		const path = `/xrpc/${nsid}`;

		const headers: Record<string, string> = { ...opts?.headers };
		if (this._labelerDids.length) {
			headers['atproto-accept-labelers'] = this._labelerDids.map(d => `${d};redact`).join(', ');
		}

		let body: BodyInit | undefined;

		if (opts?.encoding === 'application/octet-stream' || data instanceof Uint8Array || data instanceof ArrayBuffer || data instanceof Blob) {
			headers['Content-Type'] = opts?.encoding || (data instanceof Blob ? data.type : 'application/octet-stream');
			body = data as BodyInit;
		} else if (data !== undefined) {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(data);
		}

		const res = await this._fetch(path, {
			method: 'POST',
			headers,
			body,
			signal: opts?.signal,
		});

		if (!res.ok) {
			const errBody = await res.json().catch(() => ({}));
			const err: any = new Error(errBody.message || `XRPC ${nsid} failed: ${res.status}`);
			err.status = res.status;
			err.error = errBody.error;
			throw err;
		}

		const contentType = res.headers.get('content-type');
		if (contentType?.includes('application/json')) {
			return await res.json();
		}
		if (contentType?.includes('application/octet-stream') || contentType?.includes('application/vnd.ipld.car')) {
			return await res.arrayBuffer() as any;
		}
		return undefined as any;
	}
}
