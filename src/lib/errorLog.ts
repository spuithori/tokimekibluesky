export interface ErrorLogEntry {
    ts: string;
    source: string;
    name: string;
    message: string;
    stack?: string;
}

const MAX_ENTRIES = 20;
const entries: ErrorLogEntry[] = [];

export function recordError(error: unknown, source: string) {
    const err = error instanceof Error ? error : undefined;
    entries.push({
        ts: new Date().toISOString(),
        source,
        name: err?.name ?? typeof error,
        message: err?.message ?? String(error),
        stack: err?.stack?.split('\n').slice(0, 3).join('\n'),
    });

    if (entries.length > MAX_ENTRIES) {
        entries.shift();
    }
}

export function getErrorLog(): ErrorLogEntry[] {
    return [...entries];
}
