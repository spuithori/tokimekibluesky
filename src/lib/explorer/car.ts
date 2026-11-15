import { CID } from 'multiformats/cid';
import * as dagCbor from '@ipld/dag-cbor';

export interface Car {
    roots: CID[];
    blocks: Map<string, Uint8Array>;
}

function readVarint(bytes: Uint8Array, offset: number): [number, number] {
    let value = 0;
    let shift = 0;
    let pos = offset;
    for (;;) {
        if (pos >= bytes.length) throw new Error('CAR: unexpected end of data');
        const byte = bytes[pos++];
        value += (byte & 0x7f) * 2 ** shift;
        if (byte < 0x80) break;
        shift += 7;
        if (shift > 49) throw new Error('CAR: varint too long');
    }
    return [value, pos];
}

export function readCar(bytes: Uint8Array): Car {
    const [headerLength, headerStart] = readVarint(bytes, 0);
    const headerEnd = headerStart + headerLength;
    if (headerLength === 0 || headerEnd > bytes.length) throw new Error('CAR: invalid header');
    const header = dagCbor.decode<{ version: number; roots: CID[] }>(bytes.subarray(headerStart, headerEnd));
    if (header?.version !== 1 || !Array.isArray(header.roots)) throw new Error('CAR: unsupported version');

    const blocks = new Map<string, Uint8Array>();
    let pos = headerEnd;
    while (pos < bytes.length) {
        const [sectionLength, sectionStart] = readVarint(bytes, pos);
        const sectionEnd = sectionStart + sectionLength;
        if (sectionLength === 0 || sectionEnd > bytes.length) throw new Error('CAR: truncated block');
        const section = bytes.subarray(sectionStart, sectionEnd);
        const [cid, data] = CID.decodeFirst(section);
        blocks.set(cid.toString(), data);
        pos = sectionEnd;
    }

    return { roots: header.roots, blocks };
}

export function decodeBlock<T = unknown>(car: Car, cid: CID | string): T | undefined {
    const data = car.blocks.get(typeof cid === 'string' ? cid : cid.toString());
    return data ? dagCbor.decode<T>(data) : undefined;
}
