import type { CID } from 'multiformats/cid';
import { decodeBlock, type Car } from './car';

interface MstEntry {
    p: number;
    k: Uint8Array;
    v: CID;
    t: CID | null;
}

interface MstNode {
    l: CID | null;
    e: MstEntry[];
}

export interface MstLeaf {
    key: string;
    cid: CID;
}

const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function* walkMst(car: Car, root: CID): Generator<MstLeaf> {
    const stack: Array<{ node: MstNode; index: number; lastKey: Uint8Array }> = [];

    const push = (cid: CID | null) => {
        for (let next = cid; next; ) {
            const node = decodeBlock<MstNode>(car, next);
            if (!node || !Array.isArray(node.e)) return;
            stack.push({ node, index: 0, lastKey: new Uint8Array(0) });
            next = node.l;
        }
    };

    push(root);

    while (stack.length) {
        const frame = stack[stack.length - 1];
        if (frame.index >= frame.node.e.length) {
            stack.pop();
            continue;
        }
        const entry = frame.node.e[frame.index++];
        const key = new Uint8Array(entry.p + entry.k.length);
        key.set(frame.lastKey.subarray(0, entry.p));
        key.set(entry.k, entry.p);
        frame.lastKey = key;
        yield { key: decoder.decode(key), cid: entry.v };
        push(entry.t);
    }
}

function compareBytes(a: Uint8Array, b: Uint8Array): number {
    const length = Math.min(a.length, b.length);
    for (let i = 0; i < length; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
}

export function findInMst(car: Car, root: CID, key: string): CID | null {
    const target = encoder.encode(key);
    let cursor: CID | null = root;

    while (cursor) {
        const node: MstNode | undefined = decodeBlock<MstNode>(car, cursor);
        if (!node || !Array.isArray(node.e)) return null;

        let next: CID | null = node.l;
        let lastKey = new Uint8Array(0);
        let found: CID | null = null;

        for (const entry of node.e) {
            const entryKey = new Uint8Array(entry.p + entry.k.length);
            entryKey.set(lastKey.subarray(0, entry.p));
            entryKey.set(entry.k, entry.p);
            lastKey = entryKey;

            const order = compareBytes(target, entryKey);
            if (order === 0) {
                found = entry.v;
                break;
            }
            if (order < 0) break;
            next = entry.t;
        }

        if (found) return found;
        cursor = next;
    }

    return null;
}
