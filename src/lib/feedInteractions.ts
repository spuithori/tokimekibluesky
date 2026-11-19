import type { Attachment } from 'svelte/attachments';
import type { Agent } from '$lib/agent';
import { isHomePlusUri } from '$lib/homeplus/feeds';

const EVENT_NS = 'app.bsky.feed.defs#';
const FLUSH_DELAY = 10_000;
const MAX_BATCH = 200;
const SENT_LIMIT = 2000;
const SENT_TRIM = 500;
const RETRY_AFTER = 60_000;

export type FeedInteractionEvent =
    | 'requestLess'
    | 'requestMore'
    | 'interactionSeen'
    | 'interactionLike'
    | 'interactionRepost'
    | 'interactionReply'
    | 'interactionQuote'
    | 'interactionShare'
    | 'clickthroughItem'
    | 'clickthroughAuthor'
    | 'clickthroughReposter'
    | 'clickthroughEmbed';

type FeedItemLike = {
    post?: { uri?: string };
    feedContext?: string;
    reqId?: string;
    __sourceId?: string;
};

type ColumnLike = {
    algorithm?: {
        type?: string;
        algorithm?: string;
        sources?: Array<{ id: string; type: string; algorithm?: string }>;
    };
};

type Interaction = { item: string; event: string; feedContext?: string; reqId?: string };

type Queue = {
    agent: Agent;
    serviceDid: string;
    pending: Interaction[];
    sent: Set<string>;
};

const resolved = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const failedAt = new Map<string, number>();
const queues = new Map<string, Queue>();
const visibleCallbacks = new WeakMap<Element, () => void>();

let observer: IntersectionObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let listening = false;

export function interactionFeedUri(column: ColumnLike | undefined, item: FeedItemLike | undefined): string | undefined {
    const algorithm = column?.algorithm;
    if (!algorithm) {
        return undefined;
    }
    let uri: string | undefined;
    if (algorithm.type === 'custom') {
        uri = algorithm.algorithm;
    } else if (algorithm.type === 'merge' && item?.__sourceId) {
        const source = algorithm.sources?.find(s => s.id === item.__sourceId);
        uri = source?.type === 'custom' ? source.algorithm : undefined;
    }
    return uri && !isHomePlusUri(uri) ? uri : undefined;
}

export function resolveInteractionTarget(agent: Agent, feedUri: string): Promise<string | null> {
    if (resolved.has(feedUri)) {
        return Promise.resolve(resolved.get(feedUri) ?? null);
    }

    const failed = failedAt.get(feedUri);
    if (failed !== undefined && Date.now() - failed < RETRY_AFTER) {
        return Promise.resolve(null);
    }

    let request = inflight.get(feedUri);
    if (!request) {
        request = agent.xrpc.get('app.bsky.feed.getFeedGenerator', { feed: feedUri })
            .then((res: any) => {
                const serviceDid: string | null = res?.view?.acceptsInteractions === true && res.view.did ? res.view.did : null;
                resolved.set(feedUri, serviceDid);
                failedAt.delete(feedUri);
                return serviceDid;
            })
            .catch(() => {
                failedAt.set(feedUri, Date.now());
                return null;
            })
            .finally(() => {
                inflight.delete(feedUri);
            });
        inflight.set(feedUri, request);
    }
    return request;
}

function queueKey(agent: Agent, feedUri: string): string {
    return `${agent.did()}|${feedUri}`;
}

function flushQueue(queue: Queue): void {
    while (queue.pending.length > 0) {
        const interactions = queue.pending.splice(0, MAX_BATCH);
        queue.agent.xrpc
            .post('app.bsky.feed.sendInteractions', { interactions }, { headers: { 'atproto-proxy': `${queue.serviceDid}#bsky_fg` } })
            .catch(() => {});
    }
}

export function flushFeedInteractions(): void {
    if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
    }
    for (const queue of queues.values()) {
        flushQueue(queue);
    }
}

function handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
        flushFeedInteractions();
    }
}

function schedule(): void {
    timer ??= setTimeout(flushFeedInteractions, FLUSH_DELAY);

    if (!listening && typeof document !== 'undefined') {
        listening = true;
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', flushFeedInteractions);
    }
}

export function queueFeedInteraction(
    agent: Agent,
    feedUri: string,
    serviceDid: string,
    item: FeedItemLike,
    event: FeedInteractionEvent,
    immediate = false,
): boolean {
    const uri = item?.post?.uri;
    if (!uri || item.feedContext?.startsWith('ad:')) {
        return false;
    }

    const key = queueKey(agent, feedUri);
    let queue = queues.get(key);
    if (!queue) {
        queue = { agent, serviceDid, pending: [], sent: new Set() };
        queues.set(key, queue);
    }

    const id = `${event}|${uri}`;
    if (queue.sent.has(id)) {
        return false;
    }
    queue.sent.add(id);
    if (queue.sent.size > SENT_LIMIT) {
        let drop = SENT_TRIM;
        for (const old of queue.sent) {
            queue.sent.delete(old);
            if (--drop === 0) {
                break;
            }
        }
    }

    const interaction: Interaction = { item: uri, event: EVENT_NS + event };
    if (item.feedContext) {
        interaction.feedContext = item.feedContext;
    }
    if (item.reqId) {
        interaction.reqId = item.reqId;
    }
    queue.pending.push(interaction);

    if (immediate) {
        flushQueue(queue);
    } else {
        schedule();
    }
    return true;
}

function getObserver(): IntersectionObserver {
    observer ??= new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) {
                continue;
            }
            observer?.unobserve(entry.target);
            const callback = visibleCallbacks.get(entry.target);
            visibleCallbacks.delete(entry.target);
            callback?.();
        }
    }, { rootMargin: '-25% 0px -25% 0px' });
    return observer;
}

export function feedSeenAttachment(agent: Agent | undefined, column: ColumnLike | undefined, item: FeedItemLike | undefined): Attachment | undefined {
    const feedUri = interactionFeedUri(column, item);
    const uri = item?.post?.uri;
    if (!feedUri || !uri || !agent || resolved.get(feedUri) === null) {
        return undefined;
    }
    if (queues.get(queueKey(agent, feedUri))?.sent.has(`interactionSeen|${uri}`)) {
        return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') {
        return undefined;
    }

    const feedItem = item as FeedItemLike;

    return (node) => {
        let active = true;

        const start = (serviceDid: string) => {
            visibleCallbacks.set(node, () => {
                queueFeedInteraction(agent, feedUri, serviceDid, feedItem, 'interactionSeen');
            });
            getObserver().observe(node);
        };

        const known = resolved.get(feedUri);
        if (known) {
            start(known);
        } else {
            resolveInteractionTarget(agent, feedUri).then((serviceDid) => {
                if (serviceDid && active) {
                    start(serviceDid);
                }
            });
        }

        return () => {
            active = false;
            if (visibleCallbacks.delete(node)) {
                observer?.unobserve(node);
            }
        };
    };
}
