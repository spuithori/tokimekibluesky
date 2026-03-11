const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

export function createConfidentialFetch(
    clientAssertionEndpoint: string,
    originalFetch: typeof fetch = globalThis.fetch,
): typeof fetch {
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

        try {
            const assertionResponse = await originalFetch(clientAssertionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    DPoP: dpopHeader,
                },
                body: JSON.stringify({ aud }),
            });

            if (!assertionResponse.ok) {
                console.error('Failed to get client assertion');
                return originalFetch(input, init);
            }

            const result = await assertionResponse.json();

            params.set('client_assertion_type', CLIENT_ASSERTION_TYPE);
            params.set('client_assertion', result.jwt);
        } catch (error) {
            console.error('Error getting client assertion:', error);
            return originalFetch(url.toString(), {
                method: 'POST',
                headers,
                body: body as string,
            });
        }

        return originalFetch(url.toString(), {
            method: 'POST',
            headers,
            body: params.toString(),
        });
    };
}
