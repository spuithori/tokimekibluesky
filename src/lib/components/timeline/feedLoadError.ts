export type FeedLoadErrorKind =
    | 'feedgenDoesNotExist'
    | 'feedgenMisconfigured'
    | 'feedgenBadResponse'
    | 'feedgenOffline'
    | 'feedgenUnknown'
    | 'feedTooManyRequests'
    | 'unknown';

export interface FeedLoadError {
    kind: FeedLoadErrorKind;
    serverMessage: string;
}

const FEEDGEN_MATCHERS: [string, FeedLoadErrorKind][] = [
    ['could not find feed', 'feedgenDoesNotExist'],
    ['feed unavailable', 'feedgenOffline'],
    ['invalid did document', 'feedgenMisconfigured'],
    ['could not resolve did document', 'feedgenMisconfigured'],
    ['could not resolve identity', 'feedgenMisconfigured'],
    ['invalid feed generator service details in did document', 'feedgenMisconfigured'],
    ['invalid response', 'feedgenBadResponse'],
];

function detectKind(algorithmType: string | undefined, status: unknown, message: string): FeedLoadErrorKind {
    if (algorithmType !== 'custom') {
        return 'unknown';
    }

    if (status === 429) {
        return 'feedTooManyRequests';
    }

    for (const [needle, kind] of FEEDGEN_MATCHERS) {
        if (message.includes(needle)) {
            return kind;
        }
    }

    return 'feedgenUnknown';
}

export function toFeedLoadError(algorithmType: string | undefined, e: any): FeedLoadError {
    const message = typeof e?.message === 'string' ? e.message : '';
    const fromServer = typeof e?.status === 'number' && !message.startsWith('XRPC ');

    return {
        kind: detectKind(algorithmType, e?.status, message),
        serverMessage: fromServer ? message : '',
    };
}

export function feedOwnerDid(feedUri: string | undefined): string {
    const match = feedUri?.match(/^at:\/\/(did:[^/]+)\/app\.bsky\.feed\.generator\//);
    return match ? match[1] : '';
}
