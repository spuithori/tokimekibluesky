import { describe, it, expect } from 'vitest';
import { TOKIMEKI_LABELER_DID, fetchSupporterPlan, findSupporterPlan, withAppLabelers } from './supporterLabels';

const NOW = Date.parse('2026-09-16T00:00:00Z');
const label = (val: string, extra: Record<string, unknown> = {}) => ({ src: TOKIMEKI_LABELER_DID, uri: 'did:plc:me', val, ...extra });

describe('findSupporterPlan', () => {
    it('returns undefined for no labels or labels from other sources', () => {
        expect(findSupporterPlan(undefined, NOW)).toBeUndefined();
        expect(findSupporterPlan([], NOW)).toBeUndefined();
        expect(findSupporterPlan([{ ...label('supporter'), src: 'did:plc:other' }], NOW)).toBeUndefined();
    });

    it('ignores negated, expired and unknown labels', () => {
        expect(findSupporterPlan([label('supporter', { neg: true })], NOW)).toBeUndefined();
        expect(findSupporterPlan([label('supporter', { exp: '2026-09-15T00:00:00Z' })], NOW)).toBeUndefined();
        expect(findSupporterPlan([label('spam')], NOW)).toBeUndefined();
    });

    it('keeps a label whose expiry is still in the future', () => {
        expect(findSupporterPlan([label('supporter', { exp: '2026-10-01T00:00:00Z' })], NOW)?.id).toBe('supporter');
    });

    it('picks the highest plan when several are present', () => {
        const plan = findSupporterPlan([label('supporter'), label('tokimeki-platinum'), label('sponsor')], NOW);
        expect(plan?.id).toBe('tokimeki-platinum');
        expect(plan?.name).toBe('TOKIMEKI PLATINUM');
    });
});

describe('withAppLabelers', () => {
    it('appends the TOKIMEKI labeler exactly once', () => {
        expect(withAppLabelers(['did:plc:a'])).toEqual(['did:plc:a', TOKIMEKI_LABELER_DID]);
        expect(withAppLabelers([TOKIMEKI_LABELER_DID, 'did:plc:a'])).toEqual([TOKIMEKI_LABELER_DID, 'did:plc:a']);
        expect(withAppLabelers([])).toEqual([TOKIMEKI_LABELER_DID]);
    });
});

describe('fetchSupporterPlan', () => {
    it('queries the labeler once for all dids and resolves the plan', async () => {
        const calls: string[] = [];
        const fetcher = (async (url: string) => {
            calls.push(url);
            return new Response(JSON.stringify({ labels: [label('sponsor', { uri: 'did:plc:b' })] }), { status: 200 });
        }) as unknown as typeof fetch;
        const plan = await fetchSupporterPlan(['did:plc:a', 'did:plc:b'], fetcher);
        expect(plan?.id).toBe('sponsor');
        expect(calls).toHaveLength(1);
        const url = new URL(calls[0]);
        expect(url.origin).toBe('https://ozone.tokimeki.tech');
        expect(url.searchParams.getAll('uriPatterns')).toEqual(['did:plc:a', 'did:plc:b']);
        expect(url.searchParams.get('sources')).toBe(TOKIMEKI_LABELER_DID);
    });

    it('skips the request when there are no dids', async () => {
        let called = false;
        const fetcher = (async () => { called = true; return new Response('{}'); }) as unknown as typeof fetch;
        expect(await fetchSupporterPlan([], fetcher)).toBeUndefined();
        expect(called).toBe(false);
    });
});
