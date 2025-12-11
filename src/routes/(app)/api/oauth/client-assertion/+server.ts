import { env } from '$env/dynamic/private';
import { importJWK, SignJWT, calculateJwkThumbprint, decodeJwt, decodeProtectedHeader } from 'jose';

export async function POST({ request, url }) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const forwardedHost = request.headers.get('x-forwarded-host') || host;
    const expectedOrigin = `${forwardedProto}://${forwardedHost}`;

    const allowedOrigins = [
        'https://tokimeki.blue',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        expectedOrigin,
    ];

    if (origin && !allowedOrigins.includes(origin)) {
        console.warn(`CORS rejected: origin=${origin}, allowed=${allowedOrigins.join(', ')}`);
        return new Response(JSON.stringify({ error: 'CORS error' }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }

    try {
        const privateKeyJwkString = env.OAUTH_PRIVATE_KEY_JWK;
        if (!privateKeyJwkString) {
            throw new Error('OAUTH_PRIVATE_KEY_JWK environment variable is not set');
        }

        const dpopProof = request.headers.get('DPoP');
        if (!dpopProof) {
            return new Response(JSON.stringify({ error: 'Missing DPoP header' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        let dpopHeader;
        try {
            dpopHeader = decodeProtectedHeader(dpopProof);
        } catch (e) {
            return new Response(JSON.stringify({ error: 'Invalid DPoP proof format' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        const dpopPublicJwk = dpopHeader.jwk;
        if (!dpopPublicJwk) {
            return new Response(JSON.stringify({ error: 'DPoP proof missing jwk in header' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        try {
            const dpopPayload = decodeJwt(dpopProof);
            if (dpopHeader.typ !== 'dpop+jwt') {
                throw new Error('Invalid DPoP proof type');
            }

            if (!dpopPayload.jti || !dpopPayload.htm || !dpopPayload.htu || !dpopPayload.iat) {
                throw new Error('DPoP proof missing required claims');
            }
            console.log('DPoP proof validated:', {
                htm: dpopPayload.htm,
                htu: dpopPayload.htu,
                iat: dpopPayload.iat,
            });
        } catch (e) {
            console.warn('DPoP validation warning:', e);
        }

        // Calculate JWK Thumbprint (jkt) from the DPoP public key
        const jkt = await calculateJwkThumbprint(dpopPublicJwk, 'sha256');
        console.log('Computed jkt from DPoP public key:', jkt);

        let aud = 'https://bsky.social';
        try {
            const body = await request.json();
            if (body.aud) {
                aud = body.aud;
            }
        } catch {

        }

        console.log('Client assertion audience:', aud);

        const privateKeyJwk = JSON.parse(privateKeyJwkString);
        const privateKey = await importJWK(privateKeyJwk, 'ES256');
        const kid = privateKeyJwk.kid || 'tokimeki-oauth-key-1';
        const clientId = `${expectedOrigin}/oauth-client-metadata.json`;
        const now = Math.floor(Date.now() / 1000);
        const jti = crypto.randomUUID();

        const jwt = await new SignJWT({
            cnf: { jkt },
        })
            .setProtectedHeader({
                alg: 'ES256',
                kid: kid,
                typ: 'jwt',
            })
            .setIssuer(clientId)
            .setSubject(clientId)
            .setAudience(aud)
            .setJti(jti)
            .setIssuedAt(now)
            .setExpirationTime(now + 60) // 1 minute expiry
            .sign(privateKey);

        console.log('Created client assertion with cnf.jkt:', jkt);

        return new Response(JSON.stringify({ jwt }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'Access-Control-Allow-Origin': origin || '*',
            }
        });
    } catch (error) {
        console.error('Client assertion error:', error);
        return new Response(JSON.stringify({ error: 'Failed to create client assertion' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin || '*',
            }
        });
    }
}

// Handle CORS preflight
export async function OPTIONS({ request }) {
    const origin = request.headers.get('origin');

    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, DPoP',
            'Access-Control-Max-Age': '86400',
        }
    });
}
