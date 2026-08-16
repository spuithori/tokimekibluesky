import { describe, it, expect } from 'vitest';
import { extractIncident, extractDownMonitors } from './bskyStatus';

const ongoingEvent = {
    type: 'announcement',
    eventType: 'announcement',
    id: 44350,
    title: 'We are experiencing an issue and are investigating',
    content: null,
    description: null,
    date: 'Aug 16, 2026',
    time: '14:58',
    timeGMT: 'Aug 16, 2026 14:58',
    endDate: null,
    endDateGMT: null,
    timestamp: 1786892289,
    status: 2,
    icon: 'alert-triangle',
};

describe('extractIncident', () => {
    it('returns the ongoing event', () => {
        const incident = extractIncident({ status: true, results: [ongoingEvent] });
        expect(incident).toEqual({
            id: 44350,
            title: 'We are experiencing an issue and are investigating',
            startedAt: 1786892289,
        });
    });

    it('ignores resolved events', () => {
        const resolved = { ...ongoingEvent, id: 100, endDate: 'Aug 15, 2026', endDateGMT: 'Aug 15, 2026 10:00' };
        expect(extractIncident({ status: true, results: [resolved] })).toBeNull();
    });

    it('picks the latest of multiple ongoing events', () => {
        const older = { ...ongoingEvent, id: 100, timestamp: 1786000000 };
        const incident = extractIncident({ status: true, results: [older, ongoingEvent] });
        expect(incident?.id).toBe(44350);
    });

    it('returns null for empty or malformed feeds', () => {
        expect(extractIncident({ status: true, results: [] })).toBeNull();
        expect(extractIncident({})).toBeNull();
        expect(extractIncident(null)).toBeNull();
        expect(extractIncident({ results: [{ id: 1, endDate: null }] })).toBeNull();
    });
});

describe('extractDownMonitors', () => {
    it('returns hostnames of danger monitors, deduped and stripped of paths', () => {
        const monitors = {
            status: 'ok',
            data: [
                { monitorId: 1, statusClass: 'success', name: 'agaric.us-west.host.bsky.network' },
                { monitorId: 2, statusClass: 'danger', name: 'chaga.us-west.host.bsky.network/xrpc/_health' },
                { monitorId: 3, statusClass: 'danger', name: 'chaga.us-west.host.bsky.network' },
                { monitorId: 4, statusClass: 'danger', name: 'enoki.us-east.host.bsky.network' },
            ],
        };
        expect(extractDownMonitors(monitors)).toEqual([
            'chaga.us-west.host.bsky.network',
            'enoki.us-east.host.bsky.network',
        ]);
    });

    it('returns empty array for all-success or malformed payloads', () => {
        expect(extractDownMonitors({ data: [{ statusClass: 'success', name: 'a' }] })).toEqual([]);
        expect(extractDownMonitors({})).toEqual([]);
        expect(extractDownMonitors(null)).toEqual([]);
    });
});
