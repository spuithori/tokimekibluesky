export interface SearchActor {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    [key: string]: unknown;
}

export interface FeedGenerator {
    uri: string;
    cid?: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    creator?: { did: string; [key: string]: unknown };
    [key: string]: unknown;
}
