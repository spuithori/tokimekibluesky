import type { WorkerInput, WorkerOutput } from './types';

type Priority = 'preview' | 'compress';

interface PoolWorkerLike {
    postMessage(message: unknown): void;
    addEventListener(type: string, listener: (event: any) => void): void;
    terminate(): void;
}

interface Task {
    id: number;
    input: WorkerInput;
    resolve: (value: WorkerOutput) => void;
    reject: (reason: Error) => void;
}

interface PoolWorker {
    worker: PoolWorkerLike;
    currentTask: Task | null;
}

function defaultWorkerFactory(): PoolWorkerLike {
    return new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as PoolWorkerLike;
}

function computeMaxWorkers(): number {
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(2, Math.min(4, cores - 1));
}

const DEFAULT_CORE_WORKERS = 1;

const pool: PoolWorker[] = [];
const previewQueue: Task[] = [];
const compressQueue: Task[] = [];

let nextTaskId = 0;
let maxWorkers = computeMaxWorkers();
let coreWorkers = DEFAULT_CORE_WORKERS;
let workerFactory: () => PoolWorkerLike = defaultWorkerFactory;

function spawnWorker(): PoolWorker {
    const worker = workerFactory();
    const pw: PoolWorker = { worker, currentTask: null };
    worker.addEventListener('message', (event: { data: WorkerOutput & { error?: string } }) => onMessage(pw, event.data));
    worker.addEventListener('error', () => onWorkerError(pw, new Error('image worker error')));
    worker.addEventListener('messageerror', () => onWorkerError(pw, new Error('image worker messageerror')));
    pool.push(pw);
    return pw;
}

function removeWorker(pw: PoolWorker): void {
    const idx = pool.indexOf(pw);
    if (idx !== -1) pool.splice(idx, 1);
    try {
        pw.worker.terminate();
    } catch {
    }
}

function assign(pw: PoolWorker, task: Task): void {
    pw.currentTask = task;
    try {
        pw.worker.postMessage(task.input);
    } catch (e) {
        pw.currentTask = null;
        removeWorker(pw);
        task.reject(e instanceof Error ? e : new Error(String(e)));
    }
}

function pumpQueue(): void {
    while (previewQueue.length > 0 || compressQueue.length > 0) {
        let pw = pool.find((w) => w.currentTask === null);
        if (!pw) {
            if (pool.length >= maxWorkers) break;
            pw = spawnWorker();
        }
        const task = previewQueue.length > 0 ? previewQueue.shift()! : compressQueue.shift()!;
        assign(pw, task);
    }
}

function maybeReap(pw: PoolWorker): void {
    if (pw.currentTask !== null) return;
    if (previewQueue.length > 0 || compressQueue.length > 0) return;
    if (pool.length <= coreWorkers) return;
    removeWorker(pw);
}

function onMessage(pw: PoolWorker, data: WorkerOutput & { error?: string }): void {
    const task = pw.currentTask;
    if (!task || task.id !== data.id) return;
    pw.currentTask = null;
    if (data.error) {
        task.reject(new Error(data.error));
    } else {
        task.resolve(data);
    }
    maybeReap(pw);
    pumpQueue();
}

function onWorkerError(pw: PoolWorker, err: Error): void {
    removeWorker(pw);
    const task = pw.currentTask;
    pw.currentTask = null;
    if (task) task.reject(err);
    pumpQueue();
}

export function runInPool(input: WorkerInput, opts?: { priority?: Priority }): Promise<WorkerOutput> {
    return new Promise<WorkerOutput>((resolve, reject) => {
        const task: Task = { id: nextTaskId++, input, resolve, reject };
        input.id = task.id;
        if (opts?.priority === 'preview') {
            previewQueue.push(task);
        } else {
            compressQueue.push(task);
        }
        pumpQueue();
    });
}

export function __configurePoolForTests(opts: {
    maxWorkers?: number;
    coreWorkers?: number;
    workerFactory?: () => PoolWorkerLike;
}): void {
    __resetPoolForTests();
    if (opts.maxWorkers !== undefined) maxWorkers = opts.maxWorkers;
    if (opts.coreWorkers !== undefined) coreWorkers = opts.coreWorkers;
    if (opts.workerFactory) workerFactory = opts.workerFactory;
}

export function __runTaskForTests(input: WorkerInput, priority?: Priority): Promise<WorkerOutput> {
    return runInPool(input, { priority });
}

export function __getPoolStateForTests(): { size: number; busy: number; previewQueued: number; compressQueued: number } {
    return {
        size: pool.length,
        busy: pool.filter((pw) => pw.currentTask !== null).length,
        previewQueued: previewQueue.length,
        compressQueued: compressQueue.length,
    };
}

export function __resetPoolForTests(): void {
    for (const pw of pool) {
        try {
            pw.worker.terminate();
        } catch {
        }
    }
    pool.length = 0;
    previewQueue.length = 0;
    compressQueue.length = 0;
    nextTaskId = 0;
    maxWorkers = computeMaxWorkers();
    coreWorkers = DEFAULT_CORE_WORKERS;
    workerFactory = defaultWorkerFactory;
}
