export interface AnalyticsState {
    cid: string;
    sid: number;
    sct: number;
    seg: 0 | 1;
    views: number;
    engaged: number;
    last: number;
}

export type AnalyticsEvent = 'page_view' | 'user_engagement';

const SESSION_TIMEOUT = 30 * 60 * 1000;
const ENGAGED_AFTER = 10_000;

export function randomInt() {
    return Math.floor(Math.random() * 0x7fffffff);
}

export function normalizeRoute(routeId: string) {
    return routeId.replace(/\/\([^/]+\)/g, '') || '/';
}

export function advanceState(prev: AnalyticsState | null, event: AnalyticsEvent, engagement: number, now: number) {
    const firstVisit = !prev;
    const sessionStart = !prev || now - prev.last > SESSION_TIMEOUT;
    const seconds = Math.floor(now / 1000);
    const cid = prev?.cid ?? `${randomInt()}.${seconds}`;
    const sid = sessionStart ? seconds : prev.sid;
    const sct = sessionStart ? (prev?.sct ?? 0) + 1 : prev.sct;
    const views = (sessionStart ? 0 : prev.views) + (event === 'page_view' ? 1 : 0);
    const engaged = (sessionStart ? 0 : prev.engaged) + engagement;
    const state: AnalyticsState = {
        cid,
        sid,
        sct,
        seg: views > 1 || engaged >= ENGAGED_AFTER ? 1 : 0,
        views,
        engaged,
        last: now,
    };

    return { state, firstVisit, sessionStart };
}
