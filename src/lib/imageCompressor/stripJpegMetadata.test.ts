// @vitest-environment node
// `stripJpegMetadata` is a private helper inside compressor.ts (not yet
// exported). To unit-test its byte-level behaviour without depending on a
// jsdom `createImageBitmap` or any WASM, we extract the function body via a
// regex over the compressor.ts source and instantiate it with `new Function`.
// When the R9+ refactor extracts the helper into a dedicated module, replace
// the extractor with a direct `import { stripJpegMetadata } from '...';`.
//
// The function signature is:
//   async function stripJpegMetadata(blob: Blob): Promise<Blob>
//
// It returns the original Blob unchanged when the MIME type is not
// image/jpeg, when the SOI marker is missing, or when stripping doesn't
// reduce the byte count. Otherwise it returns a new Blob with EXIF (APP1)
// and JFIF comment (COM) segments removed; SOS payload and all other
// segments (APP0, quantization/Huffman tables, frame headers, etc.) are
// preserved bit-for-bit.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const compressorSrc = readFileSync(join(here, 'compressor.ts'), 'utf-8');

function extractStripJpegMetadata(): (blob: Blob) => Promise<Blob> {
    // Match the entire body of the async function. The body uses one TS-only
    // type annotation (`Array<{ start: number; end: number }>`) which we
    // strip with a narrow regex before handing the body to `new Function`.
    const m = compressorSrc.match(
        /async\s+function\s+stripJpegMetadata\([^)]*\)\s*:\s*Promise<Blob>\s*\{([\s\S]*?)\n\}/,
    );
    if (!m) throw new Error('stripJpegMetadata not found in compressor.ts');
    let body = m[1];
    // Strip the `: Array<{ ... }> = []` style annotation on the `kept` local.
    body = body.replace(/(\bconst\s+kept)\s*:\s*Array<\{[^}]*\}>\s*=/, '$1 =');
    return new Function('blob', `return (async () => { ${body} })();`) as unknown as (
        blob: Blob,
    ) => Promise<Blob>;
}

const stripJpegMetadata = extractStripJpegMetadata();

// ---------------------------------------------------------------------------
// Hand-crafted minimal JPEGs. None of these are decodable images — they only
// need to contain a valid marker stream so the byte-level scanner can walk
// them. Each marker segment is:
//
//   0xFF, marker, length_hi, length_lo, payload...
//
// where length includes the two length bytes themselves.
// ---------------------------------------------------------------------------

const SOI = [0xff, 0xd8];
const EOI = [0xff, 0xd9];

// Length-prefixed segment helper (length includes itself + payload).
function segment(marker: number, payload: number[]): number[] {
    const length = payload.length + 2;
    return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

// APP0 = JFIF identifier ("JFIF\0" + 1.01 + units + dx + dy + thumb 0x0).
const APP0_JFIF = segment(0xe0, [
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version
    0x00,       // units
    0x00, 0x01, // x density
    0x00, 0x01, // y density
    0x00, 0x00, // thumbnail
]);

// APP1 = EXIF stub ("Exif\0\0" + some bytes).
const APP1_EXIF = segment(0xe1, [
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    ...new Array(30).fill(0xaa),
]);

// COM = JFIF comment ("hello world!!!")
const COM_COMMENT = segment(0xfe, Array.from('hello world!!!', (c) => c.charCodeAt(0)));

// DQT (quantization table) stub — required-style segment we MUST keep.
const DQT = segment(0xdb, [0x00, ...new Array(64).fill(0x10)]);

// SOS (start of scan) — its "length" header is followed by entropy-coded
// data until EOI. The implementation MUST keep every byte from SOS through
// the end of the buffer (it doesn't try to parse the entropy stream).
const SOS = segment(0xda, [0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00]);
const ENTROPY = [0xab, 0xcd, 0xef, 0x12, 0x34, 0x56, 0x78];

function buildJpeg(parts: number[][]): Uint8Array {
    const flat: number[] = [];
    for (const p of parts) flat.push(...p);
    return new Uint8Array(flat);
}

function blobFrom(bytes: Uint8Array, type = 'image/jpeg'): Blob {
    return new Blob([bytes], { type });
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
    return new Uint8Array(await blob.arrayBuffer());
}

describe('stripJpegMetadata', () => {
    it('returns the same blob unchanged when type is not image/jpeg', async () => {
        const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
        const out = await stripJpegMetadata(png);
        expect(out).toBe(png);
    });

    it('returns the same blob unchanged when SOI marker is missing', async () => {
        const noSoi = blobFrom(new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]));
        const out = await stripJpegMetadata(noSoi);
        expect(out).toBe(noSoi);
    });

    it('returns the same blob when input is shorter than 4 bytes', async () => {
        const tiny = blobFrom(new Uint8Array([0xff, 0xd8, 0xff]));
        const out = await stripJpegMetadata(tiny);
        expect(out).toBe(tiny);
    });

    it('returns the same blob when no APP1/COM are present (nothing to strip)', async () => {
        // SOI + APP0 + DQT + SOS + entropy + EOI — strip pass produces the
        // same byte count, so the implementation short-circuits and returns
        // the original Blob (object identity preserved).
        const bytes = buildJpeg([SOI, APP0_JFIF, DQT, SOS, ENTROPY, EOI]);
        const input = blobFrom(bytes);
        const out = await stripJpegMetadata(input);
        expect(out).toBe(input);
    });

    it('removes a single APP1 (EXIF) segment and keeps every other byte', async () => {
        const withExif = buildJpeg([SOI, APP0_JFIF, APP1_EXIF, DQT, SOS, ENTROPY, EOI]);
        const without = buildJpeg([SOI, APP0_JFIF, DQT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(withExif));
        const outBytes = await bytesOf(out);
        expect(outBytes.length).toBe(without.length);
        expect(Array.from(outBytes)).toEqual(Array.from(without));
        expect(out.type).toBe('image/jpeg');
    });

    it('removes a single COM segment and keeps every other byte', async () => {
        const withCom = buildJpeg([SOI, APP0_JFIF, COM_COMMENT, DQT, SOS, ENTROPY, EOI]);
        const without = buildJpeg([SOI, APP0_JFIF, DQT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(withCom));
        const outBytes = await bytesOf(out);
        expect(Array.from(outBytes)).toEqual(Array.from(without));
    });

    it('removes multiple APP1 + COM segments in one pass', async () => {
        const noisy = buildJpeg([SOI, APP1_EXIF, APP0_JFIF, COM_COMMENT, APP1_EXIF, DQT, SOS, ENTROPY, EOI]);
        const expected = buildJpeg([SOI, APP0_JFIF, DQT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(noisy));
        const outBytes = await bytesOf(out);
        expect(Array.from(outBytes)).toEqual(Array.from(expected));
    });

    it('preserves the entire SOS-through-EOI tail (entropy bytes intact)', async () => {
        const noisy = buildJpeg([SOI, APP1_EXIF, DQT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(noisy));
        const outBytes = await bytesOf(out);
        // Locate SOS marker in the output and confirm every byte from there
        // matches the original tail.
        let sosOffset = -1;
        for (let i = 2; i < outBytes.length - 1; i++) {
            if (outBytes[i] === 0xff && outBytes[i + 1] === 0xda) {
                sosOffset = i;
                break;
            }
        }
        expect(sosOffset).toBeGreaterThan(0);
        const expectedTail = buildJpeg([SOS, ENTROPY, EOI]);
        const tail = outBytes.slice(sosOffset);
        expect(Array.from(tail)).toEqual(Array.from(expectedTail));
    });

    it('keeps APP0 (JFIF) segments — only APP1 + COM are stripped', async () => {
        const noisy = buildJpeg([SOI, APP0_JFIF, APP1_EXIF, COM_COMMENT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(noisy));
        const outBytes = await bytesOf(out);
        // APP0 marker should still be at offset 2 (right after SOI).
        expect(outBytes[2]).toBe(0xff);
        expect(outBytes[3]).toBe(0xe0);
    });

    it('keeps standalone markers (RST0..RST7, TEM) intact', async () => {
        // RST0 (0xD0) is a 2-byte standalone marker — it MUST NOT be parsed
        // as a length-prefixed segment.
        const withRst = buildJpeg([SOI, APP0_JFIF, [0xff, 0xd0], SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(withRst));
        const outBytes = await bytesOf(out);
        // RST0 should still be present, untouched.
        let found = false;
        for (let i = 2; i < outBytes.length - 1; i++) {
            if (outBytes[i] === 0xff && outBytes[i + 1] === 0xd0) {
                found = true;
                break;
            }
        }
        expect(found).toBe(true);
    });

    it('stops gracefully at a truncated segment header (output is just SOI)', async () => {
        // SOI + APP1 marker followed by a truncated length byte → the inner
        // `if (i + 4 > buffer.length) break` triggers, no segments are kept
        // beyond the implicit SOI, so the output is just the two SOI bytes
        // (smaller than the input → a new Blob is returned, not the original).
        const truncated = blobFrom(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00]));
        const out = await stripJpegMetadata(truncated);
        expect(out.size).toBe(2);
        expect(out.type).toBe('image/jpeg');
        const outBytes = await bytesOf(out);
        expect(Array.from(outBytes)).toEqual([0xff, 0xd8]);
    });

    it('produces a smaller output than the input when stripping succeeds', async () => {
        const noisy = buildJpeg([SOI, APP1_EXIF, COM_COMMENT, APP1_EXIF, DQT, SOS, ENTROPY, EOI]);
        const input = blobFrom(noisy);
        const out = await stripJpegMetadata(input);
        expect(out.size).toBeLessThan(input.size);
    });

    it('returned blob keeps the image/jpeg type', async () => {
        const noisy = buildJpeg([SOI, APP1_EXIF, DQT, SOS, ENTROPY, EOI]);
        const out = await stripJpegMetadata(blobFrom(noisy));
        expect(out.type).toBe('image/jpeg');
    });
});
