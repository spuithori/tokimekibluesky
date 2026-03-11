// Lightweight password-based session management replacing BskyAgent session handling

export interface SessionData {
	did: string;
	handle: string;
	accessJwt: string;
	refreshJwt: string;
	email?: string;
	emailConfirmed?: boolean;
	emailAuthFactor?: boolean;
	active?: boolean;
	status?: string;
	didDoc?: any;
}

export type SessionEvent = 'create' | 'update' | 'expired';

export type PersistSessionHandler = (evt: SessionEvent, sess?: SessionData) => void | Promise<void>;

function isJwtExpired(jwt: string, bufferMs: number = 60_000): boolean {
	try {
		const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
		return !payload.exp || Date.now() >= payload.exp * 1000 - bufferMs;
	} catch {
		return true;
	}
}

function getPdsEndpointFromDidDoc(didDoc: any): string | undefined {
	if (!didDoc?.service) return undefined;
	const pdsService = didDoc.service.find(
		(s: any) => s.id === '#atproto_pds' || s.id?.endsWith('#atproto_pds')
	);
	return pdsService?.serviceEndpoint;
}

export class PasswordSession {
	private _service: string;
	private _pdsUrl: string | undefined;
	private _session: SessionData | undefined;
	private _persistSession: PersistSessionHandler | undefined;
	private _refreshing: Promise<void> | null = null;

	private _onExpired?: () => void;

	constructor(opts: { service: string; persistSession?: PersistSessionHandler; onExpired?: () => void }) {
		this._service = opts.service.replace(/\/$/, '');
		this._persistSession = opts.persistSession;
		this._onExpired = opts.onExpired;
	}

	get session(): SessionData | undefined {
		return this._session;
	}

	get did(): string | undefined {
		return this._session?.did;
	}

	get service(): string {
		return this._pdsUrl || this._service;
	}

	private _updatePdsUrl(didDoc: any): void {
		const pdsUrl = getPdsEndpointFromDidDoc(didDoc);
		if (pdsUrl) {
			this._pdsUrl = pdsUrl.replace(/\/$/, '');
		}
	}

	async login(opts: { identifier: string; password: string; authFactorToken?: string }): Promise<SessionData> {
		const res = await fetch(`${this._service}/xrpc/com.atproto.server.createSession`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(opts),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			const err: any = new Error(body.message || `Login failed: ${res.status}`);
			err.status = res.status;
			err.error = body.error;
			throw err;
		}

		const data: SessionData = await res.json();
		this._session = data;

		if (data.didDoc) {
			this._updatePdsUrl(data.didDoc);
		}

		await this._persistSession?.('create', data);
		return data;
	}

	async resumeSession(session: SessionData): Promise<void> {
		this._session = session;

		if (session.didDoc) {
			this._updatePdsUrl(session.didDoc);
		}

		if (isJwtExpired(session.accessJwt)) {
			try {
				await this.refreshSession();
			} catch (e: any) {
				if (e.error === 'ExpiredToken' || e.message === 'Token has expired') {
					this._session = undefined;
					await this._persistSession?.('expired');
					throw e;
				}
				throw e;
			}
		} else {
			this.refreshSession().catch(() => {});
		}
	}

	async refreshSession(): Promise<void> {
		if (this._refreshing) {
			return this._refreshing;
		}

		this._refreshing = this._doRefresh();
		try {
			await this._refreshing;
		} finally {
			this._refreshing = null;
		}
	}

	private async _doRefresh(): Promise<void> {
		if (!this._session?.refreshJwt) {
			throw new Error('No refresh token');
		}

		const refreshUrl = this._pdsUrl || this._service;
		const res = await fetch(`${refreshUrl}/xrpc/com.atproto.server.refreshSession`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this._session.refreshJwt}`,
			},
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			const err: any = new Error(body.message || 'Token has expired');
			err.status = res.status;
			err.error = body.error || 'ExpiredToken';
			throw err;
		}

		const data = await res.json();
		this._session = {
			...this._session,
			did: data.did,
			handle: data.handle,
			accessJwt: data.accessJwt,
			refreshJwt: data.refreshJwt,
		};

		if (data.didDoc) {
			this._updatePdsUrl(data.didDoc);
		}

		await this._persistSession?.('update', this._session);
	}

	createFetchHandler(): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
		return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
			const serviceUrl = this._pdsUrl || this._service;
			const fullUrl = url.startsWith('/') ? `${serviceUrl}${url}` : url;

			const headers = new Headers(init?.headers);
			if (this._session?.accessJwt) {
				headers.set('Authorization', `Bearer ${this._session.accessJwt}`);
			}

			let res = await fetch(fullUrl, { ...init, headers });

			if (res.status === 401 && this._session?.refreshJwt) {
				try {
					await this.refreshSession();
				} catch {
					this._onExpired?.();
					return res;
				}

				const retryHeaders = new Headers(init?.headers);
				if (this._session?.accessJwt) {
					retryHeaders.set('Authorization', `Bearer ${this._session.accessJwt}`);
				}
				const retryServiceUrl = this._pdsUrl || this._service;
				const retryFullUrl = url.startsWith('/') ? `${retryServiceUrl}${url}` : url;
				res = await fetch(retryFullUrl, { ...init, headers: retryHeaders });
			}

			return res;
		};
	}
}
