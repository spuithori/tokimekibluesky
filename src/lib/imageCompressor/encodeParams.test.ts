// @vitest-environment node
// Regression guard for WebP/MozJPEG encode params (Plan v5.4 P4-6: R5 F1+ approve).
// `encodeWebpWasm` runs inside a Web Worker (worker.ts) and a main-thread
// fallback (fallback.ts), neither of which can be imported in jsdom/node
// without spinning up the @jsquash WASM module. Instead, we statically
// verify the source files keep the approved params and F1+ structure so
// a regression cannot silently re-introduce `use_sharp_yuv: 1` or revert
// the F1+ q=95 fast-path + descent search logic.
//
// In addition, `smartGuessQStart` is currently a private function inside both
// worker.ts and fallback.ts. Since the refactoring-engineer is extracting
// shared code into a dedicated module in parallel, we (1) keep the regex
// guard against the *source text* and (2) extract the function body via a
// small parser and execute it in isolation to verify the *runtime behaviour*
// (boundary conditions) without depending on the WASM-bound encoder modules.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const workerSrc = readFileSync(join(here, 'worker.ts'), 'utf-8');
const fallbackSrc = readFileSync(join(here, 'fallback.ts'), 'utf-8');

describe('encodeWebpWasm params (F1+ regression guard)', () => {
  it('worker.ts uses NOSY (use_sharp_yuv: 0) and F0 (autofilter: 0, filter_strength: 60)', () => {
    expect(workerSrc).toMatch(/use_sharp_yuv:\s*0/);
    expect(workerSrc).toMatch(/autofilter:\s*0/);
    expect(workerSrc).toMatch(/filter_strength:\s*60/);
    expect(workerSrc).not.toMatch(/use_sharp_yuv:\s*1/);
    expect(workerSrc).not.toMatch(/autofilter:\s*1/);
    expect(workerSrc).not.toMatch(/filter_sharpness:/);
  });

  it('fallback.ts uses same NOSY + F0 params', () => {
    expect(fallbackSrc).toMatch(/use_sharp_yuv:\s*0/);
    expect(fallbackSrc).toMatch(/autofilter:\s*0/);
    expect(fallbackSrc).toMatch(/filter_strength:\s*60/);
  });

  it('worker.ts encodeWebpWasm implements F1+ (qStart fast-path + descent search)', () => {
    expect(workerSrc).toMatch(/quality:\s*startQ/);
    expect(workerSrc).toMatch(/lo\s*=\s*70/);
    expect(workerSrc).toMatch(/hi\s*=\s*startQ\s*-\s*1/);
    expect(workerSrc).toMatch(/i\s*<\s*3/);
    expect(workerSrc).toMatch(/fallbackNeeded/);
  });

  it('fallback.ts encodeWebpWasm implements F1+ same structure', () => {
    expect(fallbackSrc).toMatch(/quality:\s*startQ/);
    expect(fallbackSrc).toMatch(/lo\s*=\s*70/);
    expect(fallbackSrc).toMatch(/hi\s*=\s*startQ\s*-\s*1/);
    expect(fallbackSrc).toMatch(/fallbackNeeded/);
  });

  it('both files use the projected descent (projectWebpQuality)', () => {
    expect(workerSrc).toMatch(/projectWebpQuality/);
    expect(fallbackSrc).toMatch(/projectWebpQuality/);
  });

  it('both files have the measurement-based resolution fallback (always completes)', () => {
    expect(workerSrc).toMatch(/nextResolutionForTarget/);
    expect(workerSrc).toMatch(/MIN_RESOLUTION_DIMENSION/);
    expect(fallbackSrc).toMatch(/nextResolutionForTarget/);
    expect(fallbackSrc).toMatch(/MIN_RESOLUTION_DIMENSION/);
  });

  it('MozJPEG is fully removed (WebP + resolution reduction only)', () => {
    expect(workerSrc).not.toMatch(/encodeMozJpegWasm/);
    expect(workerSrc).not.toMatch(/@jsquash\/jpeg/);
    expect(fallbackSrc).not.toMatch(/encodeMozJpegWasm/);
    expect(fallbackSrc).not.toMatch(/@jsquash\/jpeg/);
  });

  it('worker.ts has V5 smart-guess (mp>=5 AND bpp_mp>=200k → qStart=85)', () => {
    expect(workerSrc).toMatch(/smartGuessQStart/);
    expect(workerSrc).toMatch(/mp\s*<\s*5/);
    expect(workerSrc).toMatch(/200_000/);
    expect(workerSrc).toMatch(/return\s+85/);
  });

  it('fallback.ts has same smart-guess', () => {
    expect(fallbackSrc).toMatch(/smartGuessQStart/);
    expect(fallbackSrc).toMatch(/200_000/);
    expect(fallbackSrc).toMatch(/return\s+85/);
  });

  it('worker.ts uses WEBP method=2 (R8 D) + segments=4', () => {
    expect(workerSrc).toMatch(/method:\s*2/);
    expect(workerSrc).toMatch(/segments:\s*4/);
    expect(workerSrc).not.toMatch(/method:\s*4/);
  });

  it('fallback.ts uses WEBP method=2', () => {
    expect(fallbackSrc).toMatch(/method:\s*2/);
    expect(fallbackSrc).not.toMatch(/method:\s*4/);
  });

  it('worker.ts smart-guess returns 95 when no maxSizeBytes (unbounded encode)', () => {
    // `startQ = maxSizeBytes !== undefined ? smartGuessQStart(...) : 95`
    expect(workerSrc).toMatch(/maxSizeBytes\s*!==\s*undefined[\s\S]*?smartGuessQStart[\s\S]*?:\s*95/);
  });

  it('fallback.ts smart-guess returns 95 when no maxSizeBytes', () => {
    expect(fallbackSrc).toMatch(/maxSizeBytes\s*!==\s*undefined[\s\S]*?smartGuessQStart[\s\S]*?:\s*95/);
  });

  it('worker.ts uses sns_strength=80 and filter_type=1', () => {
    expect(workerSrc).toMatch(/sns_strength:\s*80/);
    expect(workerSrc).toMatch(/filter_type:\s*1/);
  });

  it('fallback.ts uses sns_strength=80 and filter_type=1', () => {
    expect(fallbackSrc).toMatch(/sns_strength:\s*80/);
    expect(fallbackSrc).toMatch(/filter_type:\s*1/);
  });

  it('both files keep the WEBP_BASE_PARAMS as an `as const` literal (no runtime mutation)', () => {
    expect(workerSrc).toMatch(/const\s+WEBP_BASE_PARAMS\s*=\s*\{[\s\S]*?\}\s*as\s+const/);
    expect(fallbackSrc).toMatch(/const\s+WEBP_BASE_PARAMS\s*=\s*\{[\s\S]*?\}\s*as\s+const/);
  });
});

// ---------------------------------------------------------------------------
// smartGuessQStart logic test (V5 smart-guess boundary)
// ---------------------------------------------------------------------------
//
// The helper lives inside worker.ts / fallback.ts as a private function and is
// not exported. To keep regression coverage for the boundary conditions even
// before the refactoring extracts it into a shared module, we extract the
// function body via a regex from the source text and instantiate it with
// `new Function`. Once the refactor lands and the helper becomes importable,
// this block should be replaced with a direct import.

function extractSmartGuessQStart(src: string): (input: number, w: number, h: number) => number {
  // Match: function smartGuessQStart(inputBytes: number, width: number, height: number): number { ... }
  // We grab the body up to the matching closing brace (single-level body).
  const match = src.match(
    /function\s+smartGuessQStart\([^)]*\)\s*:\s*number\s*\{([\s\S]*?)\n\}/,
  );
  if (!match) {
    throw new Error('smartGuessQStart not found in source');
  }
  const body = match[1];
  // Strip TS type annotations on the destructured parameters (we pass plain JS in).
  // The function body uses `_` numeric separators (1_000_000, 200_000) which is
  // valid in modern JS engines that Vitest/Node supports out of the box.
  return new Function('inputBytes', 'width', 'height', body) as (
    input: number,
    w: number,
    h: number,
  ) => number;
}

describe('smartGuessQStart logic (V5 smart-guess boundary)', () => {
  const workerFn = extractSmartGuessQStart(workerSrc);
  const fallbackFn = extractSmartGuessQStart(fallbackSrc);
  const cases: Array<[string, (input: number, w: number, h: number) => number]> = [
    ['worker.ts', workerFn],
    ['fallback.ts', fallbackFn],
  ];

  for (const [label, fn] of cases) {
    describe(label, () => {
      it('returns 95 for a small image (mp < 5)', () => {
        // 1920x1080 ≈ 2.07 mp
        expect(fn(500_000, 1920, 1080)).toBe(95);
      });

      it('returns 95 for a low-bpp heavy image (mp >= 5 but bpp_mp < 200k)', () => {
        // 3000x2000 = 6 mp, 1_000_000 bytes / 6 mp ≈ 166_666 bppMp < 200k → 95
        expect(fn(1_000_000, 3000, 2000)).toBe(95);
      });

      it('returns 85 for a heavy image (mp >= 5 AND bpp_mp >= 200k)', () => {
        // 4000x3000 = 12 mp, 3_000_000 / 12 = 250_000 bppMp ≥ 200k → 85
        expect(fn(3_000_000, 4000, 3000)).toBe(85);
      });

      it('boundary: mp exactly 5 with bpp_mp >= 200k returns 85', () => {
        // 2500x2000 = 5_000_000 px = 5 mp exact; mp < 5 check fails → continue
        // bpp_mp = 1_500_000 / 5 = 300_000 ≥ 200k → 85
        expect(fn(1_500_000, 2500, 2000)).toBe(85);
      });

      it('boundary: mp just under 5 always returns 95 regardless of bpp_mp', () => {
        // 2499x2000 = 4_998_000 px ≈ 4.998 mp < 5 → 95
        expect(fn(10_000_000, 2499, 2000)).toBe(95);
      });

      it('boundary: bpp_mp exactly 200_000 with mp >= 5 returns 85', () => {
        // 2500x2000 = 5 mp; need bpp_mp = 200_000 → inputBytes = 1_000_000
        // bppMp >= 200_000 fails (< check), wait: code is `if (bppMp < 200_000) return 95`
        // so bppMp = 200_000 is NOT < 200_000 → falls through to return 85.
        expect(fn(1_000_000, 2500, 2000)).toBe(85);
      });

      it('boundary: bpp_mp just under 200_000 returns 95', () => {
        // bpp_mp = 199_999.something. mp = 5, inputBytes = 999_999
        expect(fn(999_999, 2500, 2000)).toBe(95);
      });

      it('massive image with very high bpp_mp returns 85', () => {
        // 8000x6000 = 48 mp; 20_000_000 bytes / 48 ≈ 416_666 bpp_mp → 85
        expect(fn(20_000_000, 8000, 6000)).toBe(85);
      });

      it('massive image but extremely well-compressed source returns 95', () => {
        // 8000x6000 = 48 mp; 500_000 bytes / 48 ≈ 10_416 bpp_mp < 200k → 95
        expect(fn(500_000, 8000, 6000)).toBe(95);
      });

      it('1x1 degenerate image returns 95', () => {
        expect(fn(100, 1, 1)).toBe(95);
      });
    });
  }
});
