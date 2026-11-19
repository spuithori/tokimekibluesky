import type { Attachment } from 'svelte/attachments';
import type { ServerVote } from './pollTally';

const LIVE_URL = 'wss://live.poll.tokimeki.tech/v1';
const SETTLE_MS = 400;
const LINGER_MS = 20_000;
const KEEPALIVE_MS = 30_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 60_000;

export type PollLiveUpdate =
    | { gone: true }
    | { gone: false; counts: number[]; ended: boolean; mine: ServerVote | undefined };

type Listener = (update: PollLiveUpdate) => void;
type Watch = { uri: string; viewer: string; listeners: Set<Listener> };
type Entry = string | [string, string];

const watches = new Map<string, Watch>();
const sent = new Set<string>();
const visibility = new WeakMap<Element, (visible: boolean) => void>();

let socket: WebSocket | null = null;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let lingerTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let keepaliveTimer: ReturnType<typeof setInterval> | undefined;
let attempts = 0;
let listening = false;
let observer: IntersectionObserver | undefined;

function toEntry(key: string): Entry {
    const watch = watches.get(key);
    if (watch) {
        return watch.viewer ? [watch.uri, watch.viewer] : watch.uri;
    }
    const split = key.indexOf(' ');
    const uri = key.slice(0, split);
    const viewer = key.slice(split + 1);
    return viewer ? [uri, viewer] : uri;
}

function canConnect(): boolean {
    return watches.size > 0 && document.visibilityState === 'visible' && navigator.onLine !== false;
}

function clearRetry() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
}

function teardown() {
    socket = null;
    sent.clear();
    clearInterval(keepaliveTimer);
    keepaliveTimer = undefined;
    clearTimeout(lingerTimer);
    lingerTimer = undefined;
}

function close() {
    const ws = socket;
    if (!ws) {
        return;
    }
    teardown();
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.close();
}

function retry() {
    if (retryTimer !== undefined) {
        return;
    }
    const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** attempts) * (0.5 + Math.random() / 2);
    attempts += 1;
    retryTimer = setTimeout(() => {
        retryTimer = undefined;
        connect();
    }, delay);
}

function dispatch(data: unknown) {
    if (typeof data !== 'string') {
        return;
    }
    let message: any;
    try {
        message = JSON.parse(data);
    } catch {
        return;
    }
    const uri = message?.p;
    if (typeof uri !== 'string') {
        return;
    }
    const gone = message.x === 1;
    if (!gone && !Array.isArray(message.c)) {
        return;
    }
    for (const watch of [...watches.values()]) {
        if (watch.uri !== uri) {
            continue;
        }
        const update: PollLiveUpdate = gone
            ? { gone: true }
            : { gone: false, counts: message.c, ended: message.e === 1, mine: watch.viewer && message.m ? message.m[watch.viewer] : undefined };
        for (const listener of [...watch.listeners]) {
            listener(update);
        }
    }
}

function connect() {
    if (socket || !canConnect()) {
        return;
    }
    clearRetry();
    let ws: WebSocket;
    try {
        ws = new WebSocket(LIVE_URL);
    } catch {
        return;
    }
    socket = ws;

    ws.onopen = () => {
        if (socket !== ws) {
            return;
        }
        sent.clear();
        keepaliveTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('');
            }
        }, KEEPALIVE_MS);
        sync();
    };

    ws.onmessage = (event) => {
        if (socket !== ws) {
            return;
        }
        attempts = 0;
        dispatch(event.data);
    };

    ws.onclose = () => {
        if (socket !== ws) {
            return;
        }
        teardown();
        if (canConnect()) {
            retry();
        }
    };
}

function sync() {
    clearTimeout(settleTimer);
    settleTimer = undefined;

    if (!socket) {
        connect();
        return;
    }
    if (socket.readyState !== WebSocket.OPEN) {
        return;
    }

    const remove = [...sent].filter((key) => !watches.has(key));
    const add = [...watches.keys()].filter((key) => !sent.has(key));
    if (remove.length > 0 || add.length > 0) {
        const frame: { u?: Entry[]; s?: Entry[] } = {};
        if (remove.length > 0) {
            frame.u = remove.map(toEntry);
        }
        if (add.length > 0) {
            frame.s = add.map(toEntry);
        }
        socket.send(JSON.stringify(frame));
        for (const key of remove) {
            sent.delete(key);
        }
        for (const key of add) {
            sent.add(key);
        }
    }

    if (watches.size === 0) {
        lingerTimer ??= setTimeout(() => {
            lingerTimer = undefined;
            if (watches.size === 0) {
                close();
            }
        }, LINGER_MS);
    } else {
        clearTimeout(lingerTimer);
        lingerTimer = undefined;
    }
}

function schedule() {
    settleTimer ??= setTimeout(sync, SETTLE_MS);
}

function resume() {
    if (document.visibilityState !== 'visible') {
        clearRetry();
        close();
        return;
    }
    if (watches.size > 0 && !socket) {
        attempts = 0;
        clearRetry();
        connect();
    }
}

function suspend() {
    clearRetry();
    close();
}

function listen() {
    if (listening) {
        return;
    }
    listening = true;
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('online', resume);
    window.addEventListener('pagehide', suspend);
}

export function watchPollLive(uri: string, viewer: string | undefined, listener: Listener): () => void {
    if (typeof WebSocket === 'undefined' || typeof document === 'undefined') {
        return () => {};
    }
    listen();

    const key = `${uri} ${viewer ?? ''}`;
    let watch = watches.get(key);
    if (watch) {
        sent.delete(key);
    } else {
        watch = { uri, viewer: viewer ?? '', listeners: new Set() };
        watches.set(key, watch);
    }
    watch.listeners.add(listener);
    schedule();

    return () => {
        const current = watches.get(key);
        if (!current?.listeners.delete(listener)) {
            return;
        }
        if (current.listeners.size === 0) {
            watches.delete(key);
            schedule();
        }
    };
}

function getObserver(): IntersectionObserver {
    observer ??= new IntersectionObserver((entries) => {
        for (const entry of entries) {
            visibility.get(entry.target)?.(entry.isIntersecting);
        }
    });
    return observer;
}

export function pollLive(uri: string, viewer: string | undefined, listener: Listener): Attachment {
    return (node) => {
        let stop: (() => void) | undefined;
        const setVisible = (visible: boolean) => {
            if (visible) {
                stop ??= watchPollLive(uri, viewer, listener);
            } else if (stop) {
                stop();
                stop = undefined;
            }
        };

        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return () => setVisible(false);
        }

        visibility.set(node, setVisible);
        getObserver().observe(node);

        return () => {
            observer?.unobserve(node);
            visibility.delete(node);
            setVisible(false);
        };
    };
}
