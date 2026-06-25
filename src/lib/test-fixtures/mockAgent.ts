import { Agent } from '$lib/agent';
import type { FetchHandler } from '$lib/xrpc-client';

export type XrpcResponse = unknown | (() => unknown);
export type XrpcResponses = Record<string, XrpcResponse>;

export interface MockAgent {
    agent: Agent;
    overrideResponse(nsid: string, body: XrpcResponse): void;
}

export function createMockAgent(opts: { did?: string; responses?: XrpcResponses } = {}): MockAgent {
    const responses: XrpcResponses = { ...opts.responses };

    const fetchHandler: FetchHandler = async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        const path = url.split('?')[0];
        const nsid = path.includes('/xrpc/') ? path.split('/xrpc/')[1] : path;
        const entry = responses[nsid];
        const body = typeof entry === 'function' ? (entry as () => unknown)() : entry;

        if (body === undefined) {
            return new Response(
                JSON.stringify({ error: 'NotFound', message: `No mock response for ${nsid}` }),
                { status: 404, headers: { 'content-type': 'application/json' } },
            );
        }

        return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'content-type': 'application/json' },
        });
    };

    const agent = new Agent({
        fetchHandler,
        did: opts.did ?? 'did:plc:tokimekitest',
        handle: 'test.bsky.social',
        isOAuth: false,
    });

    return {
        agent,
        overrideResponse(nsid, body) {
            responses[nsid] = body;
        },
    };
}
