import * as dagCbor from '@ipld/dag-cbor';
import { CID } from 'multiformats/cid';
import { decodeBlock, readCar, type Car } from './car';
import { findInMst } from './mst';
import { parseMultikey, verifyEcdsa, type KeyType } from './ecdsa';

export interface RepoCommit {
    did: string;
    version: number;
    data: CID;
    rev: string;
    prev: CID | null;
    sig: Uint8Array;
}

export type SignatureStatus = 'valid' | 'invalid' | 'no-key' | 'unsupported-key';

export interface RecordProof {
    commitCid: string;
    rev: string;
    did: string;
    didMatches: boolean;
    blocksIntact: boolean;
    signature: SignatureStatus;
    keyType?: KeyType;
    recordCid: string | null;
    value?: unknown;
}

const SHA256_CODE = 0x12;

async function sha256(data: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

async function blocksIntact(car: Car): Promise<boolean> {
    for (const [key, data] of car.blocks) {
        const cid = CID.parse(key);
        if (cid.multihash.code !== SHA256_CODE) return false;
        if (!equalBytes(await sha256(data), cid.multihash.digest)) return false;
    }
    return true;
}

export async function verifyCommitSignature(commit: RepoCommit, signingKey: string | undefined): Promise<{ status: SignatureStatus; keyType?: KeyType }> {
    if (!signingKey) return { status: 'no-key' };
    const key = parseMultikey(signingKey);
    if (!key) return { status: 'unsupported-key' };
    const { sig, ...unsigned } = commit;
    const hash = await sha256(dagCbor.encode(unsigned));
    return { status: verifyEcdsa(key, hash, sig) ? 'valid' : 'invalid', keyType: key.type };
}

export async function verifyRecordProof(
    carBytes: Uint8Array,
    target: { did: string; collection: string; rkey: string; signingKey?: string },
): Promise<RecordProof> {
    const car = readCar(carBytes);
    const root = car.roots[0];
    const commit = root ? decodeBlock<RepoCommit>(car, root) : undefined;
    if (!root || !commit?.data || !commit.sig) throw new Error('proof has no commit');

    const [intact, signature] = await Promise.all([
        blocksIntact(car),
        verifyCommitSignature(commit, target.signingKey),
    ]);

    const recordCid = findInMst(car, commit.data, `${target.collection}/${target.rkey}`);

    return {
        commitCid: root.toString(),
        rev: commit.rev,
        did: commit.did,
        didMatches: commit.did === target.did,
        blocksIntact: intact,
        signature: signature.status,
        keyType: signature.keyType,
        recordCid: recordCid ? recordCid.toString() : null,
        value: recordCid ? decodeBlock(car, recordCid) : undefined,
    };
}
