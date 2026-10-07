import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractIncident, type BskyStatusResponse } from '$lib/bskyStatus';

const SUMMARY_URL = 'https://status.bsky.app/summary.json';

export const GET: RequestHandler = async () => {
    let summary: unknown;
    try {
        const res = await fetch(SUMMARY_URL, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
            throw new Error(`${res.status}`);
        }
        summary = await res.json();
    } catch {
        return json({ ok: false } satisfies BskyStatusResponse, {
            headers: { 'Cache-Control': 'public, s-maxage=30' },
        });
    }

    const body: BskyStatusResponse = {
        ok: true,
        incident: extractIncident(summary),
    };

    return json(body, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
};
