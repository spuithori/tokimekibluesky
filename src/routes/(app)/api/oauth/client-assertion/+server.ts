import { env } from '$env/dynamic/private';
import { importJWK, SignJWT, calculateJwkThumbprint, jwtVerify, decodeProtectedHeader } from 'jose';

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

        if (dpopHeader.typ !== 'dpop+jwt') {
            return new Response(JSON.stringify({ error: 'Invalid DPoP proof type' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        let dpopPayload;
        try {
            const dpopPublicKey = await importJWK(dpopPublicJwk, dpopHeader.alg || 'ES256');
            const { payload } = await jwtVerify(dpopProof, dpopPublicKey, {
                typ: 'dpop+jwt',
            });
            dpopPayload = payload;
        } catch (e) {
            console.error('DPoP signature verification failed:', e);
            return new Response(JSON.stringify({ error: 'DPoP signature verification failed' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        if (!dpopPayload.jti || !dpopPayload.htm || !dpopPayload.htu || !dpopPayload.iat) {
            return new Response(JSON.stringify({ error: 'DPoP proof missing required claims' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        const now = Math.floor(Date.now() / 1000);
        const iat = dpopPayload.iat as number;
        if (Math.abs(now - iat) > 300) {
            return new Response(JSON.stringify({ error: 'DPoP proof iat is too old or in the future' }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin || '*',
                }
            });
        }

        console.log('DPoP proof validated:', {
            htm: dpopPayload.htm,
            htu: dpopPayload.htu,
            iat: dpopPayload.iat,
        });

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
        const assertionNow = Math.floor(Date.now() / 1000);
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
            .setIssuedAt(assertionNow)
            .setExpirationTime(assertionNow + 60) // 1 minute expiry
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
