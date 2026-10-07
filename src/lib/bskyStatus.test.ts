import { describe, it, expect } from 'vitest';
import { extractIncident } from './bskyStatus';

const activeIncident = {
    id: 'cmuy32qf001u00wruwef8uuv7',
    name: 'Site loading failure',
    started: '2026-10-07T12:28:16.513Z',
    status: 'INVESTIGATING',
    impact: 'PARTIALOUTAGE',
    url: 'https://status.bsky.app/cmuy32qf001u00wruwef8uuv7',
    updatedAt: '2026-10-07T12:28:16.572Z',
};

const summary = (overrides: Record<string, unknown> = {}) => ({
    page: { name: 'Bluesky', url: 'https://status.bsky.app', status: 'HASISSUES' },
    activeIncidents: [activeIncident],
    ...overrides,
});

describe('extractIncident', () => {
    it('returns the active incident', () => {
        expect(extractIncident(summary())).toEqual({
            id: 'cmuy32qf001u00wruwef8uuv7',
            title: 'Site loading failure',
            url: 'https://status.bsky.app/cmuy32qf001u00wruwef8uuv7',
        });
    });

    it('returns null when the page is up with nothing active', () => {
        expect(extractIncident(summary({ page: { status: 'UP' }, activeIncidents: [] }))).toBeNull();
        expect(extractIncident({ page: { status: 'UP' } })).toBeNull();
    });

    it('ignores resolved incidents', () => {
        const resolved = { ...activeIncident, status: 'RESOLVED' };
        expect(extractIncident(summary({ page: { status: 'UP' }, activeIncidents: [resolved] }))).toBeNull();
    });

    it('picks the most recently started of multiple active incidents', () => {
        const older = { ...activeIncident, id: 'older', started: '2026-10-07T10:00:00.000Z' };
        expect(extractIncident(summary({ activeIncidents: [activeIncident, older] }))?.id).toBe(activeIncident.id);
        expect(extractIncident(summary({ activeIncidents: [older, activeIncident] }))?.id).toBe(activeIncident.id);
    });

    it('surfaces only in-progress maintenances', () => {
        const maintenance = {
            id: 'mnt1',
            name: 'Database upgrade',
            start: '2026-10-07T13:00:00.000Z',
            status: 'INPROGRESS',
            duration: '60',
            url: 'https://status.bsky.app/mnt1',
        };
        const inProgress = summary({ page: { status: 'UNDERMAINTENANCE' }, activeIncidents: [], activeMaintenances: [maintenance] });
        expect(extractIncident(inProgress)?.id).toBe('mnt1');

        const upcoming = summary({ page: { status: 'UP' }, activeIncidents: [], activeMaintenances: [{ ...maintenance, status: 'NOTSTARTEDYET' }] });
        expect(extractIncident(upcoming)).toBeNull();
    });

    it('falls back to a page-level incident when the page has issues without an announcement', () => {
        expect(extractIncident(summary({ activeIncidents: [] }))).toEqual({ id: 'page:HASISSUES', title: null, url: null });
    });

    it('drops non-https detail urls', () => {
        const incident = { ...activeIncident, url: 'javascript:alert(1)' };
        expect(extractIncident(summary({ activeIncidents: [incident] }))?.url).toBeNull();
    });

    it('returns null for malformed summaries', () => {
        expect(extractIncident({})).toBeNull();
        expect(extractIncident(null)).toBeNull();
        expect(extractIncident({ activeIncidents: [{ id: 1, status: 'INVESTIGATING' }] })).toBeNull();
    });
});
