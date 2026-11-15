// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { create as createDigest } from 'multiformats/hashes/digest';
import { base58btc } from 'multiformats/bases/base58';
import { readCar } from './car';
import { walkMst, findInMst } from './mst';
import { parseMultikey, verifyEcdsa } from './ecdsa';
import { verifyRecordProof } from './verify';
import { tidToDate } from './tid';

const ORDER = {
    secp256k1: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
    prime256v1: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
};
const PREFIX = { secp256k1: [0xe7, 0x01], prime256v1: [0x80, 0x24] };

type CurveName = keyof typeof ORDER;

function sha256(data: Uint8Array): Uint8Array {
    return new Uint8Array(createHash('sha256').update(data).digest());
}

function cidOf(data: Uint8Array, codec = 0x71): CID {
    return CID.createV1(codec, createDigest(0x12, sha256(data)));
}

function varint(value: number): number[] {
    const out: number[] = [];
    let v = value;
    while (v >= 0x80) {
        out.push((v & 0x7f) | 0x80);
        v = Math.floor(v / 128);
    }
    out.push(v);
    return out;
}

function concat(parts: Array<Uint8Array | number[]>): Uint8Array {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

function writeCar(root: CID, blocks: Array<[CID, Uint8Array]>): Uint8Array {
    const header = dagCbor.encode({ version: 1, roots: [root] });
    const parts: Array<Uint8Array | number[]> = [varint(header.length), header];
    for (const [cid, data] of blocks) {
        parts.push(varint(cid.bytes.length + data.length), cid.bytes, data);
    }
    return concat(parts);
}

function makeKey(curve: CurveName) {
    const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: curve });
    const jwk = publicKey.export({ format: 'jwk' });
    const x = Buffer.from(jwk.x!, 'base64url');
    const y = Buffer.from(jwk.y!, 'base64url');
    const compressed = concat([[y[y.length - 1] & 1 ? 3 : 2], new Uint8Array(x)]);
    const multikey = base58btc.encode(concat([PREFIX[curve], compressed]));

    const signLowS = (data: Uint8Array): Uint8Array => {
        const raw = new Uint8Array(sign('sha256', data, { key: privateKey, dsaEncoding: 'ieee-p1363' }));
        let s = BigInt('0x' + Buffer.from(raw.subarray(32)).toString('hex'));
        if (s > ORDER[curve] >> 1n) s = ORDER[curve] - s;
        raw.set(Buffer.from(s.toString(16).padStart(64, '0'), 'hex'), 32);
        return raw;
    };

    return { multikey, signLowS };
}

const encoder = new TextEncoder();

function buildRepo(curve: CurveName, did = 'did:plc:explorertest0000000000000') {
    const key = makeKey(curve);
    const records: Array<[string, Record<string, unknown>]> = [
        ['app.bsky.feed.like/3lbaaaaaaaa2a', { $type: 'app.bsky.feed.like', createdAt: '2026-01-01T00:00:00.000Z' }],
        ['app.bsky.feed.post/3lbaaaaaaaa2b', { $type: 'app.bsky.feed.post', text: 'first', createdAt: '2026-01-01T00:00:00.000Z' }],
        ['app.bsky.feed.post/3lbaaaaaaaa2c', { $type: 'app.bsky.feed.post', text: 'second', createdAt: '2026-01-02T00:00:00.000Z' }],
        ['tech.tokimeki.sample/self', { $type: 'tech.tokimeki.sample', name: 'sample' }],
    ];
    const blocks: Array<[CID, Uint8Array]> = [];
    const leaves = records.map(([path, value]) => {
        const data = dagCbor.encode(value);
        const cid = cidOf(data);
        blocks.push([cid, data]);
        return { path, cid };
    });

    const entry = (path: string, prev: string, cid: CID, tree: CID | null = null) => {
        let p = 0;
        while (p < prev.length && p < path.length && prev[p] === path[p]) p++;
        return { p, k: encoder.encode(path.slice(p)), v: cid, t: tree };
    };

    const child = dagCbor.encode({ l: null, e: [entry(leaves[2].path, '', leaves[2].cid)] });
    const childCid = cidOf(child);
    blocks.push([childCid, child]);

    const left = dagCbor.encode({ l: null, e: [entry(leaves[0].path, '', leaves[0].cid)] });
    const leftCid = cidOf(left);
    blocks.push([leftCid, left]);

    const rootNode = dagCbor.encode({
        l: leftCid,
        e: [
            entry(leaves[1].path, '', leaves[1].cid, childCid),
            entry(leaves[3].path, leaves[1].path, leaves[3].cid),
        ],
    });
    const rootCid = cidOf(rootNode);
    blocks.push([rootCid, rootNode]);

    const unsigned = { did, version: 3, data: rootCid, rev: '3lbaaaaaaaa2z', prev: null };
    const sig = key.signLowS(dagCbor.encode(unsigned));
    const commit = dagCbor.encode({ ...unsigned, sig });
    const commitCid = cidOf(commit);
    blocks.push([commitCid, commit]);

    return { did, key, records, leaves, rootCid, commitCid, car: writeCar(commitCid, blocks) };
}

describe('CAR and MST', () => {
    it('walks every record in key order across subtrees and prefix-compressed keys', () => {
        const repo = buildRepo('secp256k1');
        const car = readCar(repo.car);
        expect(car.roots[0].toString()).toBe(repo.commitCid.toString());
        expect([...walkMst(car, repo.rootCid)].map((leaf) => leaf.key)).toEqual(repo.records.map(([path]) => path));
    });

    it('finds a key through left, right and sibling subtrees and reports absence', () => {
        const repo = buildRepo('secp256k1');
        const car = readCar(repo.car);
        for (const leaf of repo.leaves) {
            expect(findInMst(car, repo.rootCid, leaf.path)?.toString()).toBe(leaf.cid.toString());
        }
        expect(findInMst(car, repo.rootCid, 'app.bsky.feed.post/3lbaaaaaaaa2x')).toBeNull();
        expect(findInMst(car, repo.rootCid, 'zzz.last/self')).toBeNull();
    });

    it('rejects truncated data', () => {
        const repo = buildRepo('secp256k1');
        expect(() => readCar(repo.car.subarray(0, repo.car.length - 5))).toThrow();
    });
});

describe('record proof verification', () => {
    for (const curve of ['secp256k1', 'prime256v1'] as const) {
        it(`accepts a commit signed with ${curve} and proves the record`, async () => {
            const repo = buildRepo(curve);
            const proof = await verifyRecordProof(repo.car, {
                did: repo.did, collection: 'app.bsky.feed.post', rkey: '3lbaaaaaaaa2c', signingKey: repo.key.multikey,
            });
            expect(proof.signature).toBe('valid');
            expect(proof.blocksIntact).toBe(true);
            expect(proof.didMatches).toBe(true);
            expect(proof.recordCid).toBe(repo.leaves[2].cid.toString());
            expect(proof.value).toMatchObject({ text: 'second' });
        });

        it(`rejects a ${curve} signature made by another key`, async () => {
            const repo = buildRepo(curve);
            const other = makeKey(curve);
            const proof = await verifyRecordProof(repo.car, {
                did: repo.did, collection: 'app.bsky.feed.post', rkey: '3lbaaaaaaaa2c', signingKey: other.multikey,
            });
            expect(proof.signature).toBe('invalid');
        });
    }

    it('flags a block whose bytes do not match its CID', async () => {
        const repo = buildRepo('secp256k1');
        const tampered = repo.car.slice();
        const needle = encoder.encode('second');
        const at = tampered.findIndex((_, i) => needle.every((byte, k) => tampered[i + k] === byte));
        tampered[at] = 'S'.charCodeAt(0);
        const proof = await verifyRecordProof(tampered, {
            did: repo.did, collection: 'app.bsky.feed.post', rkey: '3lbaaaaaaaa2c', signingKey: repo.key.multikey,
        });
        expect(proof.blocksIntact).toBe(false);
    });

    it('reports a commit of another repo and a missing key', async () => {
        const repo = buildRepo('secp256k1');
        const proof = await verifyRecordProof(repo.car, {
            did: 'did:plc:someoneelse', collection: 'app.bsky.feed.post', rkey: 'missing', signingKey: undefined,
        });
        expect(proof.didMatches).toBe(false);
        expect(proof.signature).toBe('no-key');
        expect(proof.recordCid).toBeNull();
    });

    it('rejects a high-S signature and malformed keys', () => {
        const key = makeKey('secp256k1');
        const parsed = parseMultikey(key.multikey)!;
        const data = encoder.encode('message');
        const signature = key.signLowS(data);
        expect(verifyEcdsa(parsed, sha256(data), signature)).toBe(true);
        const s = BigInt('0x' + Buffer.from(signature.subarray(32)).toString('hex'));
        const high = signature.slice();
        high.set(Buffer.from((ORDER.secp256k1 - s).toString(16).padStart(64, '0'), 'hex'), 32);
        expect(verifyEcdsa(parsed, sha256(data), high)).toBe(false);
        expect(parseMultikey('zQ3notakey')).toBeNull();
        expect(parseMultikey('not-multibase')).toBeNull();
    });
});

describe('tidToDate', () => {
    it('decodes the microsecond timestamp of a TID and ignores other record keys', () => {
        expect(tidToDate('3lbaaaaaaaa2a')?.getUTCFullYear()).toBe(2024);
        expect(tidToDate('self')).toBeNull();
        expect(tidToDate('2222222222222')).toBeNull();
    });
});
