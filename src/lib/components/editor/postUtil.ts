import * as dcbor from '@ipld/dag-cbor';
import * as Hasher from 'multiformats/hashes/hasher';
import { CID } from 'multiformats/cid';
import { AppBskyFeedPost, BlobRef } from '@atproto/api';

/**
 * These codes are inspired by bluesky-social/social-app.
 * https://github.com/bluesky-social/social-app/
 */

const mf_sha256 = Hasher.from({
    name: 'sha2-256',
    code: 0x12,
    encode: async (input) => {
        const hashBuffer = await crypto.subtle.digest('SHA-256', input);
        return new Uint8Array(hashBuffer);
    },
});

export async function computeCid(record: AppBskyFeedPost.Record): Promise<string> {
    // IMPORTANT: `prepareObject` prepares the record to be hashed by removing
    // fields with undefined value, and converting BlobRef instances to the
    // right IPLD representation.
    const prepared = prepareForHashing(record);
    // 1. Encode the record into DAG-CBOR format
    const encoded = dcbor.encode(prepared);
    // 2. Hash the record in SHA-256 (code 0x12)
    const digest = await mf_sha256.digest(encoded);
    // 3. Create a CIDv1, specifying DAG-CBOR as content (code 0x71)
    const cid = CID.createV1(0x71, digest);
    // 4. Get the Base32 representation of the CID (`b` prefix)
    return cid.toString();
}

function prepareForHashing(v: any): any {
    // IMPORTANT: BlobRef#ipld() returns the correct object we need for hashing,
    // the API client will convert this for you but we're hashing in the client,
    // so we need it *now*.
    if (v instanceof BlobRef) {
        return v.ipld()
    }

    // Walk through arrays
    if (Array.isArray(v)) {
        let pure = true
        const mapped = v.map(value => {
            if (value !== (value = prepareForHashing(value))) {
                pure = false
            }
            return value
        })
        return pure ? v : mapped
    }

    // Walk through plain objects
    if (isPlainObject(v)) {
        const obj: any = {}
        let pure = true
        for (const key in v) {
            let value = v[key]
            // `value` is undefined
            if (value === undefined) {
                pure = false
                continue
            }
            // `prepareObject` returned a value that's different from what we had before
            if (value !== (value = prepareForHashing(value))) {
                pure = false
            }
            obj[key] = value
        }
        // Return as is if we haven't needed to tamper with anything
        return pure ? v : obj
    }
    return v
}

function isPlainObject(v: any): boolean {
    if (typeof v !== 'object' || v === null) {
        return false
    }
    const proto = Object.getPrototypeOf(v)
    return proto === Object.prototype || proto === null
}
