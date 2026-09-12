import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { RealtimeClient } from './realtime';
import { realtime, realtimeStatuses } from '$lib/stores';

vi.mock('$lib/stores', async () => {
    const { writable } = await import('svelte/store');
    return {
        realtime: { set: vi.fn() },
        realtimeStatuses: writable<string[]>([]),
    };
});

class FakeWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;
    static instances: FakeWebSocket[] = [];

    readyState = FakeWebSocket.CONNECTING;
    onopen: ((ev: unknown) => void) | null = null;
    onmessage: ((ev: { data: string }) => void) | null = null;
    onclose: ((ev: unknown) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    closeCalls = 0;

    constructor(public url: string) {
        FakeWebSocket.instances.push(this);
    }

    close() {
        this.closeCalls++;
        if (this.readyState !== FakeWebSocket.CLOSED) {
            this.readyState = FakeWebSocket.CLOSING;
        }
    }

    open() {
        this.readyState = FakeWebSocket.OPEN;
        this.onopen?.({});
    }

    message(data: unknown) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }

    finishClose() {
        this.readyState = FakeWebSocket.CLOSED;
        this.onclose?.({});
    }
}

const HOST = 'Jetstream (us-east2)';

function createCommit(rkey: string) {
    return {
        did: 'did:plc:author',
        commit: {
            operation: 'create',
            collection: 'app.bsky.feed.post',
            rkey,
            record: { $type: 'app.bsky.feed.post', text: 'hello' },
        },
    };
}

beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    realtimeStatuses.set([]);
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
});

describe('RealtimeClient socket identity', () => {
    it('reconnect while the old close handshake is pending keeps exactly one live socket', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        first.open();

        client.reconnect();
        expect(first.closeCalls).toBe(1);
        const second = FakeWebSocket.instances[1];
        second.open();

        first.finishClose();
        vi.advanceTimersByTime(35_000);

        expect(FakeWebSocket.instances).toHaveLength(2);
        expect(client.status()).toBe(FakeWebSocket.OPEN);
        expect(get(realtimeStatuses)).toEqual([HOST]);

        second.message(createCommit('rkey1'));
        expect(vi.mocked(realtime.set)).toHaveBeenCalledTimes(1);
    });

    it('does not deliver events or schedule reconnects from a socket that was disconnected', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        first.open();

        client.disconnect();
        first.message(createCommit('rkey1'));
        first.finishClose();
        vi.advanceTimersByTime(35_000);

        expect(FakeWebSocket.instances).toHaveLength(1);
        expect(vi.mocked(realtime.set)).not.toHaveBeenCalled();
        expect(get(realtimeStatuses)).toEqual([]);
        expect(client.status()).toBeUndefined();
    });

    it('connect() while the previous socket is still closing replaces it without a stray reconnect', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        first.open();

        client.simulateDisconnect();
        expect(first.readyState).toBe(FakeWebSocket.CLOSING);

        client.connect();
        const second = FakeWebSocket.instances[1];
        second.open();

        first.finishClose();
        vi.advanceTimersByTime(35_000);

        expect(FakeWebSocket.instances).toHaveLength(2);
        expect(client.status()).toBe(FakeWebSocket.OPEN);
        expect(get(realtimeStatuses)).toEqual([HOST]);
    });
});

describe('RealtimeClient behaviour preserved', () => {
    it('connect() is idempotent while connecting or open', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        client.connect();
        FakeWebSocket.instances[0].open();
        client.connect();

        expect(FakeWebSocket.instances).toHaveLength(1);
        expect(FakeWebSocket.instances[0].url).toContain('/subscribe?wantedCollections=app.bsky.feed.post&wantedCollections=app.bsky.feed.repost');
    });

    it('forwards create commits to the realtime store with the same shape and ignores the rest', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const socket = FakeWebSocket.instances[0];
        socket.open();

        socket.message(createCommit('rkey1'));
        socket.message({ did: 'did:plc:author', commit: { operation: 'delete', collection: 'app.bsky.feed.post', rkey: 'x' } });
        socket.onmessage?.({ data: '' });

        expect(vi.mocked(realtime.set)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(realtime.set)).toHaveBeenCalledWith({
            isConnected: true,
            data: {
                record: { $type: 'app.bsky.feed.post', text: 'hello' },
                op: { path: 'rkey1', collection: 'app.bsky.feed.post' },
                body: { repo: 'did:plc:author' },
            },
        });
    });

    it('marks the host connected on open and disconnected after an unexpected close, then reconnects with backoff', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        expect(get(realtimeStatuses)).toEqual([]);
        first.open();
        expect(get(realtimeStatuses)).toEqual([HOST]);

        first.finishClose();
        expect(get(realtimeStatuses)).toEqual([]);
        expect(client.status()).toBeUndefined();

        vi.advanceTimersByTime(999);
        expect(FakeWebSocket.instances).toHaveLength(1);
        vi.advanceTimersByTime(1);
        expect(FakeWebSocket.instances).toHaveLength(2);

        FakeWebSocket.instances[1].finishClose();
        vi.advanceTimersByTime(1999);
        expect(FakeWebSocket.instances).toHaveLength(2);
        vi.advanceTimersByTime(1);
        expect(FakeWebSocket.instances).toHaveLength(3);

        FakeWebSocket.instances[2].open();
        expect(get(realtimeStatuses)).toEqual([HOST]);
        FakeWebSocket.instances[2].finishClose();
        vi.advanceTimersByTime(1000);
        expect(FakeWebSocket.instances).toHaveLength(4);
    });

    it('disconnect() cancels a pending reconnect and leaves the host disconnected', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        first.open();
        first.finishClose();

        client.disconnect();
        vi.advanceTimersByTime(35_000);

        expect(FakeWebSocket.instances).toHaveLength(1);
        expect(get(realtimeStatuses)).toEqual([]);
    });

    it('simulateDisconnect() closes the live socket and the client reconnects on its own', () => {
        const client = new RealtimeClient(HOST);
        client.connect();
        const first = FakeWebSocket.instances[0];
        first.open();

        client.simulateDisconnect();
        expect(first.closeCalls).toBe(1);
        first.finishClose();
        vi.advanceTimersByTime(1000);

        expect(FakeWebSocket.instances).toHaveLength(2);
        FakeWebSocket.instances[1].open();
        expect(get(realtimeStatuses)).toEqual([HOST]);
    });
});
