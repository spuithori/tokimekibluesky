import type { OAuthServerMetadata, ProtectedResourceMetadata } from './types';

/**
 * Resolve a handle to a DID.
 * Tries DNS TXT _atproto.{handle} first (via dns.google), falls back to /.well-known/atproto-did.
 */
export async function resolveHandle(handle: string): Promise<string> {
    // Try DNS-over-HTTPS
    try {
        const dnsUrl = `https://dns.google/resolve?name=_atproto.${handle}&type=TXT`;
        const res = await fetch(dnsUrl);
        if (res.ok) {
            const data = await res.json();
            if (data.Answer) {
                for (const answer of data.Answer) {
                    const txt = answer.data?.replace(/^"|"$/g, '');
                    if (txt?.startsWith('did=')) {
                        return txt.slice(4);
                    }
                }
            }
        }
    } catch {
        // Fall through to well-known
    }

    // Fallback: well-known
    const res = await fetch(`https://${handle}/.well-known/atproto-did`);
    if (!res.ok) {
        throw new Error(`Failed to resolve handle: ${handle}`);
    }
    const did = (await res.text()).trim();
    if (!did.startsWith('did:')) {
        throw new Error(`Invalid DID for handle ${handle}: ${did}`);
    }
    return did;
}

interface DidDocument {
    id: string;
    service?: Array<{
        id: string;
        type: string;
        serviceEndpoint: string;
    }>;
}

/**
 * Resolve a DID document.
 */
export async function resolveDidDocument(did: string): Promise<DidDocument> {
    if (did.startsWith('did:plc:')) {
        const res = await fetch(`https://plc.directory/${did}`);
        if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
        return res.json();
    }
    if (did.startsWith('did:web:')) {
        const host = did.slice('did:web:'.length);
        const res = await fetch(`https://${host}/.well-known/did.json`);
        if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
        return res.json();
    }
    throw new Error(`Unsupported DID method: ${did}`);
}

/**
 * Extract the PDS endpoint from a DID document.
 */
export function getPdsEndpoint(didDoc: DidDocument): string {
    const service = didDoc.service?.find(
        (s) => s.id === '#atproto_pds' && s.type === 'AtprotoPersonalDataServer',
    );
    if (!service?.serviceEndpoint) {
        throw new Error(`No PDS endpoint found for ${didDoc.id}`);
    }
    return service.serviceEndpoint;
}

/**
 * Resolve the OAuth authorization server metadata for a PDS.
 * Follows RFC 9728 (protected resource metadata) → RFC 8414 (AS metadata).
 */
export async function resolveAuthServerMetadata(
    pdsUrl: string,
): Promise<OAuthServerMetadata> {
    // Step 1: Get protected resource metadata
    const prmUrl = `${pdsUrl}/.well-known/oauth-protected-resource`;
    const prmRes = await fetch(prmUrl);
    if (!prmRes.ok) {
        throw new Error(`Failed to fetch protected resource metadata from ${pdsUrl}`);
    }
    const prm: ProtectedResourceMetadata = await prmRes.json();

    if (!prm.authorization_servers?.length) {
        throw new Error(`No authorization servers found for ${pdsUrl}`);
    }

    const asIssuer = prm.authorization_servers[0];

    // Step 2: Get authorization server metadata
    const asUrl = `${asIssuer}/.well-known/oauth-authorization-server`;
    const asRes = await fetch(asUrl);
    if (!asRes.ok) {
        throw new Error(`Failed to fetch authorization server metadata from ${asIssuer}`);
    }
    const metadata: OAuthServerMetadata = await asRes.json();

    if (metadata.issuer !== asIssuer) {
        throw new Error(`Issuer mismatch: expected ${asIssuer}, got ${metadata.issuer}`);
    }

    return metadata;
}

/**
 * Full resolution chain: handle → DID → PDS → auth server metadata.
 */
export async function resolveFromHandle(
    handle: string,
): Promise<{ did: string; pdsUrl: string; serverMetadata: OAuthServerMetadata }> {
    const did = await resolveHandle(handle);
    const didDoc = await resolveDidDocument(did);
    const pdsUrl = getPdsEndpoint(didDoc);
    const serverMetadata = await resolveAuthServerMetadata(pdsUrl);
    return { did, pdsUrl, serverMetadata };
}
