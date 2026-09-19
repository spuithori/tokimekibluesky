import { json } from '@sveltejs/kit';
import { AI_POLICY_VERSION } from '$lib/ai-policy';

export function rejectStalePolicy(url: URL): Response | undefined {
    if (url.searchParams.get('policy') === AI_POLICY_VERSION) {
        return undefined;
    }
    return json({ error: 'policy_version' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
