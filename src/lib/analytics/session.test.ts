import { describe, expect, it } from 'vitest';
import { advanceState, normalizeRoute } from './session';

const MINUTE = 60_000;
const T0 = 1_800_000_000_000;

describe('normalizeRoute', () => {
    it('sends the route pattern, never the concrete handle or post id', () => {
        expect(normalizeRoute('/(app)/profile/[handle]/post/[id]')).toBe('/profile/[handle]/post/[id]');
        expect(normalizeRoute('/(app)')).toBe('/');
        expect(normalizeRoute('/login')).toBe('/login');
    });
});

describe('advanceState', () => {
    it('marks the first visit once and keeps the client id afterwards', () => {
        const first = advanceState(null, 'page_view', 0, T0);
        const second = advanceState(first.state, 'page_view', 0, T0 + 40 * MINUTE);

        expect(first.firstVisit).toBe(true);
        expect(first.sessionStart).toBe(true);
        expect(second.firstVisit).toBe(false);
        expect(second.state.cid).toBe(first.state.cid);
    });

    it('keeps the session within 30 minutes of the last hit and starts a new one after it', () => {
        const first = advanceState(null, 'page_view', 0, T0);
        const within = advanceState(first.state, 'page_view', 0, T0 + 29 * MINUTE);
        const after = advanceState(within.state, 'page_view', 0, T0 + 29 * MINUTE + 31 * MINUTE);

        expect(within.sessionStart).toBe(false);
        expect(within.state.sid).toBe(first.state.sid);
        expect(within.state.sct).toBe(1);
        expect(after.sessionStart).toBe(true);
        expect(after.state.sid).not.toBe(first.state.sid);
        expect(after.state.sct).toBe(2);
    });

    it('becomes engaged on the second page view or after 10 seconds, and resets with the session', () => {
        const first = advanceState(null, 'page_view', 0, T0);
        const secondView = advanceState(first.state, 'page_view', 2000, T0 + 2000);
        const shortStay = advanceState(first.state, 'user_engagement', 9000, T0 + 9000);
        const longStay = advanceState(first.state, 'user_engagement', 10_000, T0 + 10_000);
        const nextSession = advanceState(longStay.state, 'page_view', 0, T0 + 60 * MINUTE);

        expect(first.state.seg).toBe(0);
        expect(secondView.state.seg).toBe(1);
        expect(shortStay.state.seg).toBe(0);
        expect(longStay.state.seg).toBe(1);
        expect(nextSession.state.seg).toBe(0);
    });
});
