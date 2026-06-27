// @vitest-environment node
import { describe, it, expect, afterEach } from 'vitest';
import type { WorkerInput, WorkerOutput } from './types';
import {
    __configurePoolForTests,
    __runTaskForTests,
    __getPoolStateForTests,
    __resetPoolForTests,
} from './workerPool';

class FakeWorker {
    listeners: Record<string, ((e: any) => void)[]> = {};
    posted: WorkerInput[] = [];
    terminated = false;
    throwOnPost = false;

    postMessage(msg: WorkerInput): void {
        if (this.throwOnPost) throw new Error('clone failed');
        this.posted.push(msg);
    }
    addEventListener(type: string, fn: (e: any) => void): void {
        (this.listeners[type] ||= []).push(fn);
    }
    terminate(): void {
        this.terminated = true;
    }

    emit(type: string, payload: any): void {
        for (const fn of this.listeners[type] || []) fn(payload);
    }
    respondLast(extra: Partial<WorkerOutput> = {}): void {
        const last = this.posted[this.posted.length - 1];
        this.emit('message', { data: { id: last.id, blob: 'blob', width: 1, height: 1, ...extra } });
    }
}

function makeInput(): WorkerInput {
    return { file: new Blob() } as unknown as WorkerInput;
}

function withFactory(opts: { maxWorkers: number; coreWorkers: number }): { created: FakeWorker[]; throwNext: () => void } {
    const created: FakeWorker[] = [];
    let throwNextFlag = false;
    __configurePoolForTests({
        maxWorkers: opts.maxWorkers,
        coreWorkers: opts.coreWorkers,
        workerFactory: () => {
            const w = new FakeWorker();
            if (throwNextFlag) { w.throwOnPost = true; throwNextFlag = false; }
            created.push(w);
            return w as any;
        },
    });
    return { created, throwNext: () => { throwNextFlag = true; } };
}

afterEach(() => __resetPoolForTests());

describe('worker pool', () => {
    it('spawns up to maxWorkers and queues the remainder', () => {
        withFactory({ maxWorkers: 2, coreWorkers: 1 });
        __runTaskForTests(makeInput());
        __runTaskForTests(makeInput());
        __runTaskForTests(makeInput());
        expect(__getPoolStateForTests()).toEqual({ size: 2, busy: 2, previewQueued: 0, compressQueued: 1 });
    });

    it('resolves a task with the worker output', async () => {
        const { created } = withFactory({ maxWorkers: 2, coreWorkers: 1 });
        const p = __runTaskForTests(makeInput());
        created[0].respondLast({ width: 800, height: 600 });
        await expect(p).resolves.toMatchObject({ width: 800, height: 600 });
    });

    it('serves preview tasks ahead of queued compress tasks', async () => {
        const { created } = withFactory({ maxWorkers: 1, coreWorkers: 1 });
        const a = __runTaskForTests(makeInput(), 'compress');
        __runTaskForTests(makeInput(), 'compress');
        __runTaskForTests(makeInput(), 'preview');
        const w = created[0];
        expect(w.posted[0].id).toBe(0);
        w.respondLast();
        await a;
        expect(w.posted[1].id).toBe(2);
    });

    it('on worker error rejects the in-flight task, drops the worker, and respawns for the queue', async () => {
        const { created } = withFactory({ maxWorkers: 1, coreWorkers: 1 });
        const a = __runTaskForTests(makeInput());
        __runTaskForTests(makeInput());
        created[0].emit('error', {});
        await expect(a).rejects.toThrow(/worker error/);
        expect(created[0].terminated).toBe(true);
        expect(created.length).toBe(2);
        expect(__getPoolStateForTests()).toEqual({ size: 1, busy: 1, previewQueued: 0, compressQueued: 0 });
    });

    it('reaps idle workers down to coreWorkers once the queues drain', async () => {
        const { created } = withFactory({ maxWorkers: 2, coreWorkers: 1 });
        const a = __runTaskForTests(makeInput());
        const b = __runTaskForTests(makeInput());
        expect(__getPoolStateForTests().size).toBe(2);
        created[0].respondLast();
        await a;
        expect(__getPoolStateForTests().size).toBe(1);
        created[1].respondLast();
        await b;
        expect(__getPoolStateForTests().size).toBe(1);
    });

    it('ignores a stale/wrong id message without settling the task', async () => {
        const { created } = withFactory({ maxWorkers: 1, coreWorkers: 1 });
        const a = __runTaskForTests(makeInput());
        const w = created[0];
        w.emit('message', { data: { id: 9999, blob: 'x', width: 1, height: 1 } });
        expect(__getPoolStateForTests().busy).toBe(1);
        w.respondLast({ width: 42 });
        await expect(a).resolves.toMatchObject({ width: 42 });
    });

    it('rejects the task and removes the worker on a synchronous postMessage throw, without respawn-looping', async () => {
        const { throwNext } = withFactory({ maxWorkers: 2, coreWorkers: 1 });
        throwNext();
        const a = __runTaskForTests(makeInput());
        await expect(a).rejects.toThrow(/clone failed/);
        expect(__getPoolStateForTests()).toEqual({ size: 0, busy: 0, previewQueued: 0, compressQueued: 0 });
    });
});
