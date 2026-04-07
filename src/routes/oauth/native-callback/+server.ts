import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const iss = url.searchParams.get('iss');

    if (!code || !state) {
        return new Response('Missing required parameters', { status: 400 });
    }

    const nativeUrl = new URL('tokimeki://oauth/callback');
    nativeUrl.searchParams.set('code', code);
    nativeUrl.searchParams.set('state', state);
    if (iss) nativeUrl.searchParams.set('iss', iss);

    const nativeUrlStr = nativeUrl.toString();

    return new Response(
        `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${nativeUrlStr}">
<title>Redirecting to TOKIMEKI...</title>
</head>
<body>
<p>Redirecting to TOKIMEKI...</p>
<p><a href="${nativeUrlStr}">Tap here if not redirected automatically</a></p>
</body>
</html>`,
        {
            status: 302,
            headers: {
                'Location': nativeUrlStr,
                'Content-Type': 'text/html; charset=utf-8',
            },
        },
    );
};
