import { BrowserOAuthClient } from '@atproto/oauth-client-browser';
import type { OAuthClientMetadataInput } from '@atproto/oauth-types';

export interface ConfidentialBrowserClientOptions {
    clientId: string;
    handleResolver: string;
    clientAssertionEndpoint?: string;
}

const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const assertionCache = new Map<string, { jwt: string; timestamp: number }>();
const ASSERTION_CACHE_TTL = 10000;

function getCachedAssertion(cacheKey: string): string | null {
    const cached = assertionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ASSERTION_CACHE_TTL) {
        return cached.jwt;
    }
    assertionCache.delete(cacheKey);
    return null;
}

function setCachedAssertion(cacheKey: string, jwt: string): void {
    assertionCache.set(cacheKey, { jwt, timestamp: Date.now() });
}

function getDpopKeyId(dpopProof: string): string | null {
    try {
        const headerPart = dpopProof.split('.')[0];
        const headerJson = atob(headerPart.replace(/-/g, '+').replace(/_/g, '/'));
        const header = JSON.parse(headerJson);

        if (header.jwk) {
            return `${header.jwk.kty}:${header.jwk.x}:${header.jwk.y}`;
        }
    } catch {

    }
    return null;
}

function createConfidentialFetch(
    clientAssertionEndpoint: string,
    originalFetch: typeof fetch = globalThis.fetch
): typeof fetch {
    return async function confidentialFetch(
        input: RequestInfo | URL,
        init?: RequestInit
    ): Promise<Response> {
        const url = typeof input === 'string'
            ? new URL(input)
            : input instanceof URL
                ? input
                : new URL(input.url);

        const method = init?.method || (input instanceof Request ? input.method : 'GET');
        const contentType = init?.headers instanceof Headers
            ? init.headers.get('Content-Type')
            : typeof init?.headers === 'object' && init.headers
                ? (init.headers as Record<string, string>)['Content-Type']
                : input instanceof Request
                    ? input.headers.get('Content-Type')
                    : undefined;

        const isTokenRequest =
            method === 'POST' &&
            contentType?.includes('application/x-www-form-urlencoded');

        if (!isTokenRequest) {
            return originalFetch(input, init);
        }

        const headers = init?.headers instanceof Headers
            ? init.headers
            : input instanceof Request
                ? input.headers
                : new Headers(init?.headers as HeadersInit);

        const dpopHeader = headers.get('DPoP');
        if (!dpopHeader) {
            return originalFetch(input, init);
        }

        const body = init?.body || (input instanceof Request ? await input.clone().text() : undefined);
        if (!body || typeof body !== 'string') {
            return originalFetch(input, init);
        }

        const params = new URLSearchParams(body);
        const grantType = params.get('grant_type');
        const responseType = params.get('response_type');
        if (!grantType && !responseType) {
            return originalFetch(input, init);
        }

        if (params.has('client_assertion')) {
            return originalFetch(input, init);
        }

        const requestType = grantType ? 'token' : 'PAR';
        const aud = url.origin;
        const dpopKeyId = getDpopKeyId(dpopHeader);
        const cacheKey = dpopKeyId ? `${aud}:${dpopKeyId}` : null;

        let clientAssertion = cacheKey ? getCachedAssertion(cacheKey) : null;

        if (clientAssertion) {
            console.log(`Intercepted ${requestType} request, using cached client assertion`);
        } else {
            console.log(`Intercepted ${requestType} request, fetching client assertion from backend...`);

            try {
                const assertionResponse = await originalFetch(clientAssertionEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'DPoP': dpopHeader,
                    },
                    body: JSON.stringify({
                        aud: aud,
                    }),
                });

                if (!assertionResponse.ok) {
                    const error = await assertionResponse.json().catch(() => ({ error: 'Unknown error' }));
                    console.error('Failed to get client assertion:', error);
                    return originalFetch(input, init);
                }

                const result = await assertionResponse.json();
                clientAssertion = result.jwt;
                console.log('Got client assertion from backend');

                if (cacheKey) {
                    setCachedAssertion(cacheKey, clientAssertion);
                }
            } catch (error) {
                console.error('Error getting client assertion:', error);
                return originalFetch(url.toString(), {
                    method: 'POST',
                    headers: headers,
                    body: body,
                });
            }
        }

        params.set('client_assertion_type', CLIENT_ASSERTION_TYPE);
        params.set('client_assertion', clientAssertion);

        return originalFetch(url.toString(), {
            method: 'POST',
            headers: headers,
            body: params.toString(),
        });
    };
}

export async function createConfidentialBrowserClient(
    options: ConfidentialBrowserClientOptions
): Promise<BrowserOAuthClient> {
    const clientAssertionEndpoint = options.clientAssertionEndpoint || '/api/oauth/client-assertion';

    const confidentialFetch = createConfidentialFetch(clientAssertionEndpoint);

    const metadataResponse = await fetch(options.clientId);
    if (!metadataResponse.ok) {
        throw new Error(`Failed to fetch client metadata: ${metadataResponse.statusText}`);
    }
    const realMetadata: OAuthClientMetadataInput = await metadataResponse.json();

    const localMetadata: OAuthClientMetadataInput = {
        ...realMetadata,
        token_endpoint_auth_method: 'none',
        token_endpoint_auth_signing_alg: undefined,
        jwks_uri: undefined,
        jwks: undefined,
    };

    console.log('Creating confidential browser client with modified local metadata');

    const client = new BrowserOAuthClient({
        clientMetadata: localMetadata,
        handleResolver: options.handleResolver,
        fetch: confidentialFetch,
    });

    return client;
}
