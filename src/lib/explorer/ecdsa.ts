import { base58btc } from 'multiformats/bases/base58';

interface Curve {
    p: bigint;
    n: bigint;
    a: bigint;
    b: bigint;
    gx: bigint;
    gy: bigint;
}

type Point = [bigint, bigint, bigint];

export type KeyType = 'secp256k1' | 'p256';

const P256_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;

const CURVES: Record<KeyType, Curve> = {
    secp256k1: {
        p: 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn,
        n: 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n,
        a: 0n,
        b: 7n,
        gx: 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n,
        gy: 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n,
    },
    p256: {
        p: P256_P,
        n: 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n,
        a: P256_P - 3n,
        b: 0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604bn,
        gx: 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n,
        gy: 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n,
    },
};

const MULTICODEC: Array<{ prefix: [number, number]; type: KeyType }> = [
    { prefix: [0xe7, 0x01], type: 'secp256k1' },
    { prefix: [0x80, 0x24], type: 'p256' },
];

function mod(value: bigint, m: bigint): bigint {
    const r = value % m;
    return r < 0n ? r + m : r;
}

function modPow(base: bigint, exponent: bigint, m: bigint): bigint {
    let result = 1n;
    let b = mod(base, m);
    let e = exponent;
    while (e > 0n) {
        if (e & 1n) result = (result * b) % m;
        b = (b * b) % m;
        e >>= 1n;
    }
    return result;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
    let value = 0n;
    for (const byte of bytes) value = (value << 8n) | BigInt(byte);
    return value;
}

function double(curve: Curve, [x, y, z]: Point): Point {
    const { p, a } = curve;
    if (z === 0n || y === 0n) return [0n, 1n, 0n];
    const yy = (y * y) % p;
    const s = (4n * x * yy) % p;
    const zz = (z * z) % p;
    const m = (3n * x * x + a * zz * zz) % p;
    const nx = mod(m * m - 2n * s, p);
    const ny = mod(m * (s - nx) - 8n * yy * yy, p);
    const nz = (2n * y * z) % p;
    return [nx, ny, nz];
}

function add(curve: Curve, a: Point, b: Point): Point {
    const { p } = curve;
    if (a[2] === 0n) return b;
    if (b[2] === 0n) return a;
    const z1z1 = (a[2] * a[2]) % p;
    const z2z2 = (b[2] * b[2]) % p;
    const u1 = (a[0] * z2z2) % p;
    const u2 = (b[0] * z1z1) % p;
    const s1 = (a[1] * z2z2 * b[2]) % p;
    const s2 = (b[1] * z1z1 * a[2]) % p;
    if (u1 === u2) {
        return s1 === s2 ? double(curve, a) : [0n, 1n, 0n];
    }
    const h = mod(u2 - u1, p);
    const r = mod(s2 - s1, p);
    const hh = (h * h) % p;
    const hhh = (hh * h) % p;
    const v = (u1 * hh) % p;
    const nx = mod(r * r - hhh - 2n * v, p);
    const ny = mod(r * (v - nx) - s1 * hhh, p);
    const nz = (h * a[2] * b[2]) % p;
    return [nx, ny, nz];
}

function decompress(curve: Curve, bytes: Uint8Array): Point | null {
    if (bytes.length !== 33 || (bytes[0] !== 2 && bytes[0] !== 3)) return null;
    const { p, a, b } = curve;
    const x = bytesToBigInt(bytes.subarray(1));
    if (x >= p) return null;
    const rhs = mod(x * x * x + a * x + b, p);
    let y = modPow(rhs, (p + 1n) / 4n, p);
    if ((y * y) % p !== rhs) return null;
    if ((y & 1n) !== BigInt(bytes[0] & 1)) y = p - y;
    return [x, y, 1n];
}

export interface ParsedKey {
    type: KeyType;
    bytes: Uint8Array;
}

export function parseMultikey(multibase: string): ParsedKey | null {
    if (!multibase.startsWith('z')) return null;
    let decoded: Uint8Array;
    try {
        decoded = base58btc.decode(multibase);
    } catch {
        return null;
    }
    for (const { prefix, type } of MULTICODEC) {
        if (decoded[0] === prefix[0] && decoded[1] === prefix[1]) {
            return { type, bytes: decoded.subarray(2) };
        }
    }
    return null;
}

export function verifyEcdsa(key: ParsedKey, hash: Uint8Array, signature: Uint8Array): boolean {
    const curve = CURVES[key.type];
    const { n, p } = curve;
    if (signature.length !== 64 || hash.length !== 32) return false;

    const r = bytesToBigInt(signature.subarray(0, 32));
    const s = bytesToBigInt(signature.subarray(32));
    if (r <= 0n || r >= n || s <= 0n || s > n >> 1n) return false;

    const q = decompress(curve, key.bytes);
    if (!q) return false;

    const z = bytesToBigInt(hash);
    const w = modPow(s, n - 2n, n);
    const u1 = (z * w) % n;
    const u2 = (r * w) % n;

    const g: Point = [curve.gx, curve.gy, 1n];
    const gq = add(curve, g, q);
    let acc: Point = [0n, 1n, 0n];
    for (let bit = 255n; bit >= 0n; bit--) {
        acc = double(curve, acc);
        const b1 = (u1 >> bit) & 1n;
        const b2 = (u2 >> bit) & 1n;
        if (b1 && b2) acc = add(curve, acc, gq);
        else if (b1) acc = add(curve, acc, g);
        else if (b2) acc = add(curve, acc, q);
    }
    if (acc[2] === 0n) return false;

    const zInv = modPow(acc[2], p - 2n, p);
    const x = (acc[0] * zInv * zInv) % p;
    return x % n === r;
}
