import type { OAuthServerMetadata, TokenResponse } from './types';
import type { DPoPKeyPair } from './dpop';
import { createDPoPProof } from './dpop';
import { getDPoPNonce, putDPoPNonce } from './store';

type FetchFn = typeof fetch;

/**
 * Execute a token endpoint request with DPoP nonce retry.
 */
async function tokenRequest(
    endpoint: string,
    params: URLSearchParams,
    dpopKey: DPoPKeyPair,
    fetchFn: FetchFn,
): Promise<TokenResponse> {
    const origin = new URL(endpoint).origin;
    let nonce = await getDPoPNonce(origin);

    for (let attempt = 0; attempt < 3; attempt++) {
        const dpopProof = await createDPoPProof({
            keyPair: dpopKey,
            htm: 'POST',
            htu: endpoint,
            nonce: nonce || undefined,
        });

        const res = await fetchFn(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpopProof,
            },
            body: params.toString(),
        });

        // Save DPoP-Nonce from response
        const responseNonce = res.headers.get('DPoP-Nonce');
        if (responseNonce) {
            nonce = responseNonce;
            await putDPoPNonce(origin, responseNonce);
        }

        if (res.ok) {
            return res.json();
        }

        // Check for use_dpop_nonce error
        const body = await res.json().catch(() => ({}));
        if (body.error === 'use_dpop_nonce' && responseNonce) {
            continue; // Retry with new nonce
        }

        throw new OAuthTokenError(body.error || 'token_error', body.error_description, res.status);
    }

    throw new Error('DPoP nonce retry exhausted');
}

export class OAuthTokenError extends Error {
    constructor(
        public readonly error: string,
        public readonly errorDescription: string | undefined,
        public readonly status: number,
    ) {
        super(errorDescription || error);
        this.name = 'OAuthTokenError';
    }
}

/**
 * Pushed Authorization Request (PAR) - RFC 9126.
 */
export async function pushAuthorizationRequest(
    metadata: OAuthServerMetadata,
    params: {
        clientId: string;
        redirectUri: string;
        codeChallenge: string;
        scope: string;
        state: string;
        loginHint?: string;
    },
    dpopKey: DPoPKeyPair,
    fetchFn: FetchFn,
): Promise<{ requestUri: string; expiresIn: number }> {
    const endpoint = metadata.pushed_authorization_request_endpoint;
    if (!endpoint) {
        throw new Error('Server does not support PAR');
    }

    const body = new URLSearchParams({
        client_id: params.clientId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
        code_challenge_method: 'S256',
        response_type: 'code',
        scope: params.scope,
        state: params.state,
        ...(params.loginHint && { login_hint: params.loginHint }),
    });

    const origin = new URL(endpoint).origin;
    let nonce = await getDPoPNonce(origin);

    for (let attempt = 0; attempt < 3; attempt++) {
        const dpopProof = await createDPoPProof({
            keyPair: dpopKey,
            htm: 'POST',
            htu: endpoint,
            nonce: nonce || undefined,
        });

        const res = await fetchFn(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'DPoP': dpopProof,
            },
            body: body.toString(),
        });

        const responseNonce = res.headers.get('DPoP-Nonce');
        if (responseNonce) {
            nonce = responseNonce;
            await putDPoPNonce(origin, responseNonce);
        }

        if (res.ok) {
            const data = await res.json();
            return { requestUri: data.request_uri, expiresIn: data.expires_in };
        }

        const errBody = await res.json().catch(() => ({}));
        if (errBody.error === 'use_dpop_nonce' && responseNonce) {
            continue;
        }

        throw new OAuthTokenError(errBody.error || 'par_error', errBody.error_description, res.status);
    }

    throw new Error('DPoP nonce retry exhausted');
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCode(
    metadata: OAuthServerMetadata,
    params: {
        code: string;
        codeVerifier: string;
        redirectUri: string;
        clientId: string;
    },
    dpopKey: DPoPKeyPair,
    fetchFn: FetchFn,
): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        code_verifier: params.codeVerifier,
        redirect_uri: params.redirectUri,
        client_id: params.clientId,
    });

    return tokenRequest(metadata.token_endpoint, body, dpopKey, fetchFn);
}

/**
 * Refresh an access token.
 */
export async function refreshToken(
    metadata: OAuthServerMetadata,
    params: {
        refreshToken: string;
        clientId: string;
    },
    dpopKey: DPoPKeyPair,
    fetchFn: FetchFn,
): Promise<TokenResponse> {
    const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: params.refreshToken,
        client_id: params.clientId,
    });

    return tokenRequest(metadata.token_endpoint, body, dpopKey, fetchFn);
}

/**
 * Revoke a token.
 */
export async function revokeToken(
    metadata: OAuthServerMetadata,
    token: string,
    fetchFn: FetchFn,
): Promise<void> {
    const endpoint = metadata.revocation_endpoint;
    if (!endpoint) return;

    try {
        await fetchFn(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token }).toString(),
        });
    } catch {
        // Revocation is best-effort
    }
}
