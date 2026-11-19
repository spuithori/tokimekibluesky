import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Mod = typeof import('./pollLive');

const POLL_A = 'at://did:plc:alice/tech.tokimeki.poll.poll/aaa';
const POLL_B = 'at://did:plc:alice/tech.tokimeki.poll.poll/bbb';
const ME = 'did:plc:me';
const OTHER = 'did:plc:other';

class FakeSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 3;
    static instances: FakeSocket[] = [];

    readyState = FakeSocket.CONNECTING;
    frames: any[] = [];
    keepalives = 0;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onclose: (() => void) | null = null;

    constructor(public url: string) {
        FakeSocket.instances.push(this);
    }

    send(data: string) {
        if (data === '') {
            this.keepalives += 1;
        } else {
            this.frames.push(JSON.parse(data));
        }
    }

    close() {
        this.readyState = FakeSocket.CLOSED;
    }

    open() {
        this.readyState = FakeSocket.OPEN;
        this.onopen?.();
    }

    receive(message: unknown) {
        this.onmessage?.({ data: JSON.stringify(message) });
    }

    drop() {
        this.readyState = FakeSocket.CLOSED;
        this.onclose?.();
    }
}

function setVisibility(state: 'visible' | 'hidden') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    document.dispatchEvent(new Event('visibilitychange'));
}

const sockets = () => FakeSocket.instances;
const last = () => FakeSocket.instances.at(-1)!;

describe('pollLive', () => {
    let mod: { watchPollLive: Mod['watchPollLive'] };
    let stops: (() => void)[] = [];

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();
        FakeSocket.instances = [];
        stops = [];
        vi.stubGlobal('WebSocket', FakeSocket);
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
        const real: Mod = await import('./pollLive');
        mod = {
            watchPollLive: (...args) => {
                const stop = real.watchPollLive(...args);
                stops.push(stop);
                return stop;
            },
        };
    });

    afterEach(() => {
        stops.forEach((stop) => stop());
        setVisibility('hidden');
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('opens nothing for a poll that leaves the screen before it has settled', () => {
        const stop = mod.watchPollLive(POLL_A, ME, () => {});
        stop();
        vi.advanceTimersByTime(60_000);
        expect(sockets()).toHaveLength(0);
    });

    it('shares one connection and asks for each poll once, however many places show it', () => {
        mod.watchPollLive(POLL_A, ME, () => {});
        mod.watchPollLive(POLL_A, ME, () => {});
        mod.watchPollLive(POLL_B, undefined, () => {});
        vi.advanceTimersByTime(400);
        expect(sockets()).toHaveLength(1);
        last().open();
        expect(last().frames).toEqual([{ s: [[POLL_A, ME], POLL_B] }]);
    });

    it('delivers a poll to the places showing it, each with the vote of its own account', () => {
        const mine = vi.fn();
        const theirs = vi.fn();
        const elsewhere = vi.fn();
        mod.watchPollLive(POLL_A, ME, mine);
        mod.watchPollLive(POLL_A, OTHER, theirs);
        mod.watchPollLive(POLL_B, ME, elsewhere);
        vi.advanceTimersByTime(400);
        last().open();

        last().receive({ p: POLL_A, c: [2, 1], m: { [ME]: [0, 'at://me/vote'], [OTHER]: null } });
        expect(mine).toHaveBeenCalledWith({ gone: false, counts: [2, 1], ended: false, mine: [0, 'at://me/vote'] });
        expect(theirs).toHaveBeenCalledWith({ gone: false, counts: [2, 1], ended: false, mine: null });
        expect(elsewhere).not.toHaveBeenCalled();

        last().receive({ p: POLL_B, c: [0, 0], e: 1 });
        expect(elsewhere).toHaveBeenCalledWith({ gone: false, counts: [0, 0], ended: true, mine: undefined });
        last().receive({ p: POLL_A, x: 1 });
        expect(mine).toHaveBeenLastCalledWith({ gone: true });
    });

    it('asks again for the current state when another place starts showing a poll already being watched', () => {
        mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        last().open();
        mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        expect(last().frames).toEqual([{ s: [[POLL_A, ME]] }, { s: [[POLL_A, ME]] }]);
    });

    it('reconnects after losing the connection and asks for everything still on screen', () => {
        mod.watchPollLive(POLL_A, ME, () => {});
        const stopB = mod.watchPollLive(POLL_B, ME, () => {});
        vi.advanceTimersByTime(400);
        last().open();
        stopB();
        vi.advanceTimersByTime(400);

        last().drop();
        vi.advanceTimersByTime(1_000);
        expect(sockets()).toHaveLength(2);
        last().open();
        expect(last().frames).toEqual([{ s: [[POLL_A, ME]] }]);
    });

    it('backs off while the server stays unreachable', () => {
        mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        for (let i = 0; i < 6; i++) {
            last().drop();
            vi.advanceTimersByTime(60_000);
        }
        const before = sockets().length;
        last().drop();
        vi.advanceTimersByTime(15_000);
        expect(sockets()).toHaveLength(before);
        vi.advanceTimersByTime(45_000);
        expect(sockets()).toHaveLength(before + 1);
    });

    it('drops the connection while the tab is hidden and restores it when the tab returns', () => {
        mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        const first = last();
        first.open();

        setVisibility('hidden');
        expect(first.readyState).toBe(FakeSocket.CLOSED);
        vi.advanceTimersByTime(120_000);
        expect(sockets()).toHaveLength(1);

        setVisibility('visible');
        expect(sockets()).toHaveLength(2);
        last().open();
        expect(last().frames).toEqual([{ s: [[POLL_A, ME]] }]);
    });

    it('stops watching when the last poll leaves, then closes unless another poll shows up first', () => {
        const stop = mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        const socket = last();
        socket.open();

        stop();
        vi.advanceTimersByTime(400);
        expect(socket.frames.at(-1)).toEqual({ u: [[POLL_A, ME]] });

        vi.advanceTimersByTime(10_000);
        const stopB = mod.watchPollLive(POLL_B, ME, () => {});
        vi.advanceTimersByTime(30_000);
        expect(socket.readyState).toBe(FakeSocket.OPEN);
        expect(socket.frames.at(-1)).toEqual({ s: [[POLL_B, ME]] });

        stopB();
        vi.advanceTimersByTime(400 + 20_000);
        expect(socket.readyState).toBe(FakeSocket.CLOSED);
        expect(sockets()).toHaveLength(1);
    });

    it('sends a keepalive only while connected', () => {
        const stop = mod.watchPollLive(POLL_A, ME, () => {});
        vi.advanceTimersByTime(400);
        const socket = last();
        socket.open();
        vi.advanceTimersByTime(90_000);
        expect(socket.keepalives).toBe(3);

        stop();
        vi.advanceTimersByTime(400 + 20_000);
        vi.advanceTimersByTime(120_000);
        expect(socket.keepalives).toBe(3);
    });
});
