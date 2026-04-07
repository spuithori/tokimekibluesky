import { GCP_PROJECT_ID, GCP_PROJECT_NUMBER, GCP_SERVICE_ACCOUNT_EMAIL, GCP_WORKLOAD_IDENTITY_POOL_ID, GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, FIREBASE_PROJECT_NUMBER } from '$env/static/private';
import { getVercelOidcToken } from '@vercel/functions/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_APP_CHECK_JWKS = createRemoteJWKSet(
    new URL('https://firebaseappcheck.googleapis.com/v1/jwks')
);

const authClient = ExternalAccountClient.fromJSON({
    type: 'external_account',
    audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    token_url: 'https://sts.googleapis.com/v1/token',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
    subject_token_supplier: {
        getSubjectToken: getVercelOidcToken,
    },
});

async function verifyAppCheckToken(token: string): Promise<boolean> {
    try {
        await jwtVerify(token, FIREBASE_APP_CHECK_JWKS, {
            audience: [`projects/${FIREBASE_PROJECT_NUMBER}`],
            issuer: `https://firebaseappcheck.googleapis.com/${FIREBASE_PROJECT_NUMBER}`,
        });
        return true;
    } catch {
        return false;
    }
}

async function translator(text = '', to = 'ja', model = undefined) {
    const accessToken = await authClient.getAccessToken();

    if (!accessToken?.token) {
        throw new Error('Failed to get access token.');
    }

    const payload: any = {
        targetLanguageCode: to,
        contents: [text],
        mimeType: 'text/plain'
    };

    if (model === 'llm') {
        payload.model = `projects/${GCP_PROJECT_ID}/locations/us-central1/models/general/translation-llm`;
    }

    const response = await fetch(`https://translation.googleapis.com/v3/projects/${GCP_PROJECT_NUMBER}:translateText`, {
        method: 'post',
        headers: {
            'Content-type': 'application/json',
            'Authorization': `Bearer ${accessToken.token}`,
            'x-goog-user-project': GCP_PROJECT_NUMBER,
        },
        body: JSON.stringify(payload),
    });
    return await response.json();
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST({ request }) {
    try {
        const appCheckToken = request.headers.get('X-Firebase-AppCheck');
        if (!appCheckToken) {
            return new Response(JSON.stringify({ error: 'Missing App Check token' }), {
                status: 401,
                headers: CORS_HEADERS,
            });
        }

        const isValid = await verifyAppCheckToken(appCheckToken);
        if (!isValid) {
            return new Response(JSON.stringify({ error: 'Invalid App Check token' }), {
                status: 403,
                headers: CORS_HEADERS,
            });
        }

        const textObj = await request.json();
        if (!textObj.text) {
            return new Response(JSON.stringify({ error: 'Missing text field' }), {
                status: 400,
                headers: CORS_HEADERS,
            });
        }

        const body = await translator(textObj.text, textObj.to, textObj.model);
        const text = body.translations[0].translatedText;
        const result = [
            {
                translations: [
                    {
                        text: text,
                    }
                ]
            }
        ];
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred.' }), {
            status: 500,
            headers: CORS_HEADERS,
        });
    }
}
