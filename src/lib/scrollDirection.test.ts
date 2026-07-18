import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scrollDirection } from "./scrollDirection";

let rafQueue: Array<() => void> = [];

beforeEach(() => {
    rafQueue = [];
    vi.stubGlobal("requestAnimationFrame", (cb: () => void) => {
        rafQueue.push(cb);
        return rafQueue.length;
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function flushRaf() {
    const queue = rafQueue;
    rafQueue = [];
    for (const cb of queue) cb();
}

function node(scrollTop: number) {
    return { scrollTop } as any;
}

describe("scrollDirection", () => {
    it("reports down then up for a single node", () => {
        const el = node(0);
        const dirs: string[] = [];

        el.scrollTop = 100;
        scrollDirection(el, 10, (d: string) => dirs.push(d));
        flushRaf();

        el.scrollTop = 20;
        scrollDirection(el, 10, (d: string) => dirs.push(d));
        flushRaf();

        expect(dirs).toEqual(["down", "up"]);
    });

    it("keeps per-node state so another node does not inherit the first node's position", () => {
        const a = node(500);
        const dirs: string[] = [];

        scrollDirection(a, 10, (d: string) => dirs.push(`a:${d}`));
        flushRaf();

        const b = node(0);
        scrollDirection(b, 10, (d: string) => dirs.push(`b:${d}`));
        flushRaf();

        expect(dirs).toEqual(["a:down"]);

        const c = node(600);
        scrollDirection(a, 10, () => {});
        expect(a.scrollTop).toBe(500);
        void c;
    });

    it("throttles per node, not globally", () => {
        const a = node(100);
        const b = node(100);
        const dirs: string[] = [];

        scrollDirection(a, 10, (d: string) => dirs.push(`a:${d}`));
        scrollDirection(b, 10, (d: string) => dirs.push(`b:${d}`));
        flushRaf();

        expect(dirs).toEqual(["a:down", "b:down"]);
    });
});
