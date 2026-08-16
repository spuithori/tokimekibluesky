import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { extractIncident, extractDownMonitors, type BskyStatusResponse } from '$lib/bskyStatus';

const STATUS_PAGE_ID = 'zwOvMT8x16';
const EVENT_FEED_URL = `https://status.bsky.app/api/getEventFeed/${STATUS_PAGE_ID}`;
const MONITOR_LIST_URL = `https://status.bsky.app/api/getMonitorList/${STATUS_PAGE_ID}`;

export const GET: RequestHandler = async () => {
    const signal = AbortSignal.timeout(8000);
    const [eventFeed, monitorList] = await Promise.allSettled([
        fetch(EVENT_FEED_URL, { signal }).then(res => res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))),
        fetch(MONITOR_LIST_URL, { signal }).then(res => res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))),
    ]);

    if (eventFeed.status === 'rejected' && monitorList.status === 'rejected') {
        return json({ ok: false } satisfies BskyStatusResponse, {
            headers: { 'Cache-Control': 'public, s-maxage=30' },
        });
    }

    const body: BskyStatusResponse = {
        ok: true,
        incident: eventFeed.status === 'fulfilled' ? extractIncident(eventFeed.value) : null,
        downMonitors: monitorList.status === 'fulfilled' ? extractDownMonitors(monitorList.value) : [],
    };

    return json(body, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
};
