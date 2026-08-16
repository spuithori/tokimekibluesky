export interface BskyIncident {
    id: number;
    title: string;
    startedAt: number;
}

export interface BskyStatusResponse {
    ok: boolean;
    incident?: BskyIncident | null;
    downMonitors?: string[];
}

export function extractIncident(feed: unknown): BskyIncident | null {
    const results = (feed as any)?.results;
    if (!Array.isArray(results)) {
        return null;
    }

    let latest: BskyIncident | null = null;
    for (const event of results) {
        if (!event || event.endDate || event.endDateGMT) continue;
        if (typeof event.id !== 'number' || typeof event.title !== 'string' || typeof event.timestamp !== 'number') continue;
        if (!latest || event.timestamp > latest.startedAt) {
            latest = { id: event.id, title: event.title, startedAt: event.timestamp };
        }
    }
    return latest;
}

export function extractDownMonitors(monitors: unknown): string[] {
    const data = (monitors as any)?.data;
    if (!Array.isArray(data)) {
        return [];
    }

    const hosts = new Set<string>();
    for (const monitor of data) {
        if (monitor?.statusClass !== 'danger' || typeof monitor.name !== 'string') continue;
        hosts.add(monitor.name.split('/')[0]);
    }
    return [...hosts];
}
