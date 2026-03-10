import type { ExportedKeyPair } from './types';

const ECDSA_PARAMS = { name: 'ECDSA', namedCurve: 'P-256' } as const;

export interface DPoPKeyPair {
    privateKey: CryptoKey;
    publicKey: CryptoKey;
    publicJwk: JsonWebKey;
}

export async function generateDPoPKeyPair(): Promise<DPoPKeyPair> {
    const keyPair = await crypto.subtle.generateKey(
        ECDSA_PARAMS,
        true,
        ['sign', 'verify'],
    );
    const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    return {
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicJwk,
    };
}

export async function exportKeyPair(pair: DPoPKeyPair): Promise<ExportedKeyPair> {
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    return {
        privateKey: privateJwk,
        publicKey: pair.publicJwk,
    };
}

export async function importKeyPair(exported: ExportedKeyPair): Promise<DPoPKeyPair> {
    const privateKey = await crypto.subtle.importKey(
        'jwk', exported.privateKey, ECDSA_PARAMS, true, ['sign'],
    );
    const publicKey = await crypto.subtle.importKey(
        'jwk', exported.publicKey, ECDSA_PARAMS, true, ['verify'],
    );
    return {
        privateKey,
        publicKey,
        publicJwk: exported.publicKey,
    };
}

export async function createDPoPProof(options: {
    keyPair: DPoPKeyPair;
    htm: string;
    htu: string;
    nonce?: string;
    ath?: string;
}): Promise<string> {
    const { keyPair, htm, htu, nonce, ath } = options;
    const url = new URL(htu);
    const cleanHtu = `${url.origin}${url.pathname}`;

    const header = {
        alg: 'ES256',
        typ: 'dpop+jwt',
        jwk: keyPair.publicJwk,
    };

    const payload: Record<string, unknown> = {
        htm,
        htu: cleanHtu,
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
    };
    if (nonce) payload.nonce = nonce;
    if (ath) payload.ath = ath;

    const encodedHeader = base64urlEncode(JSON.stringify(header));
    const encodedPayload = base64urlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        keyPair.privateKey,
        new TextEncoder().encode(signingInput),
    );

    return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

export async function computeAth(accessToken: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(accessToken);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return base64url(new Uint8Array(digest));
}

function base64url(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlEncode(str: string): string {
    return base64url(new TextEncoder().encode(str));
}
