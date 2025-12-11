import { env } from '$env/dynamic/private';

let cachedJwks: { keys: object[] } | null = null;

async function getJwks() {
    if (cachedJwks) {
        return cachedJwks;
    }

    const privateKeyJwkString = env.OAUTH_PRIVATE_KEY_JWK;
    if (!privateKeyJwkString) {
        throw new Error('OAUTH_PRIVATE_KEY_JWK environment variable is not set');
    }

    const privateKeyJwk = JSON.parse(privateKeyJwkString);
    const publicJwk = {
        kty: privateKeyJwk.kty,
        kid: privateKeyJwk.kid,
        alg: privateKeyJwk.alg || 'ES256',
        use: 'sig',
        crv: privateKeyJwk.crv,
        x: privateKeyJwk.x,
        y: privateKeyJwk.y,
    };

    cachedJwks = { keys: [publicJwk] };
    return cachedJwks;
}

export async function GET() {
    try {
        const jwks = await getJwks();

        return new Response(JSON.stringify(jwks), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            }
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('JWKS generation error:', errorMessage, error);
        return new Response(JSON.stringify({
            error: 'Failed to generate JWKS',
            details: errorMessage
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
}
