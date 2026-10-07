export interface BskyIncident {
    id: string;
    title: string | null;
    url: string | null;
}

export interface BskyStatusResponse {
    ok: boolean;
    incident?: BskyIncident | null;
}

interface Candidate {
    id: unknown;
    name: unknown;
    url: unknown;
    started: unknown;
}

export function extractIncident(summary: unknown): BskyIncident | null {
    const s = summary as any;
    const candidates: Candidate[] = [];

    if (Array.isArray(s?.activeIncidents)) {
        for (const incident of s.activeIncidents) {
            if (!incident || incident.status === 'RESOLVED') continue;
            candidates.push({ id: incident.id, name: incident.name, url: incident.url, started: incident.started });
        }
    }

    if (Array.isArray(s?.activeMaintenances)) {
        for (const maintenance of s.activeMaintenances) {
            if (!maintenance || maintenance.status !== 'INPROGRESS') continue;
            candidates.push({ id: maintenance.id, name: maintenance.name, url: maintenance.url, started: maintenance.start });
        }
    }

    let latest: BskyIncident | null = null;
    let latestStartedAt = -1;
    for (const { id, name, url, started } of candidates) {
        if (typeof id !== 'string' || typeof name !== 'string') continue;
        const startedAt = (typeof started === 'string' && Date.parse(started)) || 0;
        if (startedAt > latestStartedAt) {
            latestStartedAt = startedAt;
            latest = {
                id,
                title: name,
                url: typeof url === 'string' && url.startsWith('https://') ? url : null,
            };
        }
    }

    if (latest) {
        return latest;
    }

    const pageStatus = s?.page?.status;
    if (typeof pageStatus === 'string' && pageStatus !== 'UP') {
        return { id: `page:${pageStatus}`, title: null, url: null };
    }
    return null;
}
