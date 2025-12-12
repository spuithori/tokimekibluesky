import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, request }) => {
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || url.protocol.replace(':', '');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
    const origin = `${protocol}://${host}`;

    const metadata = {
        client_id: `${origin}/oauth-client-metadata.json`,
        client_name: 'TOKIMEKI',
        client_uri: origin,
        logo_uri: 'https://tokimeki.blue/pwa-512x512.png',
        tos_uri: 'https://docs.tokimeki.blue/ja',
        policy_uri: 'https://docs.tokimeki.blue/ja',
        redirect_uris: [
            `${origin}/oauth/callback`
        ],
        scope: 'atproto transition:generic transition:chat.bsky',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: 'private_key_jwt',
        token_endpoint_auth_signing_alg: 'ES256',
        application_type: 'web',
        dpop_bound_access_tokens: true,
        jwks_uri: `${origin}/api/oauth/jwks.json`
    };

    return json(metadata, {
        headers: {
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Content-Type': 'application/json'
        }
    });
};
