const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
const UNCONSUMED_ASSERTION_TTL = 30_000;

export function createConfidentialFetch(
    clientAssertionEndpoint: string,
    originalFetch: typeof fetch = globalThis.fetch,
): typeof fetch {
    const unconsumedAssertions = new Map<string, { jwt: string; issuedAt: number }>();

    function takeUnconsumedAssertion(key: string): { jwt: string; issuedAt: number } | undefined {
        const now = Date.now();
        for (const [storedKey, stored] of unconsumedAssertions) {
            if (now - stored.issuedAt >= UNCONSUMED_ASSERTION_TTL) {
                unconsumedAssertions.delete(storedKey);
            }
        }

        const assertion = unconsumedAssertions.get(key);
        unconsumedAssertions.delete(key);
        return assertion;
    }

    return async function confidentialFetch(
        input: RequestInfo | URL,
        init?: RequestInit,
    ): Promise<Response> {
        const url =
            typeof input === 'string'
                ? new URL(input)
                : input instanceof URL
                    ? input
                    : new URL(input.url);

        const method = init?.method || (input instanceof Request ? input.method : 'GET');
        const contentType =
            init?.headers instanceof Headers
                ? init.headers.get('Content-Type')
                : typeof init?.headers === 'object' && init.headers
                    ? (init.headers as Record<string, string>)['Content-Type']
                    : input instanceof Request
                        ? input.headers.get('Content-Type')
                        : undefined;

        const isTokenRequest =
            method === 'POST' && contentType?.includes('application/x-www-form-urlencoded');

        if (!isTokenRequest) {
            return originalFetch(input, init);
        }

        const headers =
            init?.headers instanceof Headers
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

        const aud = url.origin;

        async function requestAssertion(): Promise<Response | null> {
            try {
                return await originalFetch(clientAssertionEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        DPoP: dpopHeader,
                    },
                    body: JSON.stringify({ aud }),
                });
            } catch {
                return null;
            }
        }

        const isRefreshGrant = grantType === 'refresh_token';
        const assertionKey = `${url}\n${body}`;
        const reused = isRefreshGrant ? takeUnconsumedAssertion(assertionKey) : undefined;
        let assertion = reused;

        if (!assertion) {
            let assertionResponse = await requestAssertion();
            if (!assertionResponse?.ok) {
                assertionResponse = await requestAssertion();
            }
            if (!assertionResponse?.ok) {
                console.error('Failed to get client assertion');
                throw new Error('Client assertion unavailable');
            }

            const result = await assertionResponse.json();
            assertion = { jwt: result.jwt, issuedAt: Date.now() };
        }

        params.set('client_assertion_type', CLIENT_ASSERTION_TYPE);
        params.set('client_assertion', assertion.jwt);

        const res = await originalFetch(url.toString(), {
            method: 'POST',
            headers,
            body: params.toString(),
            signal: init?.signal,
        });

        if (res.ok || !isRefreshGrant) {
            return res;
        }

        const error = await res.clone().json().then((errorBody) => errorBody?.error, () => undefined);
        if (error === 'use_dpop_nonce') {
            unconsumedAssertions.set(assertionKey, assertion);
            return res;
        }

        if (reused) {
            throw new Error('Client assertion reuse rejected');
        }

        return res;
    };
}
