const A = 3; // Lanczos kernel size

function sinc(x: number): number {
    if (x === 0) return 1;
    const px = Math.PI * x;
    return Math.sin(px) / px;
}

function lanczosWeight(x: number): number {
    if (x >= A || x <= -A) return 0;
    return sinc(x) * sinc(x / A);
}

/**
 * Lanczos3 separable resize — significantly sharper than bilinear (canvas drawImage).
 * Two-pass: horizontal then vertical with intermediate Float32 precision.
 */
export function lanczos3Resize(
    src: Uint8ClampedArray,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number,
): Uint8ClampedArray {
    if (srcW === dstW && srcH === dstH) {
        return new Uint8ClampedArray(src);
    }

    const tmp = horizontalPass(src, srcW, srcH, dstW);
    return verticalPass(tmp, dstW, srcH, dstH);
}

function horizontalPass(
    src: Uint8ClampedArray, srcW: number, srcH: number, dstW: number,
): Float32Array {
    const scale = srcW / dstW;
    const support = Math.max(A, A * scale);
    const invScale = scale > 1 ? 1 / scale : 1;
    const out = new Float32Array(dstW * srcH * 4);

    for (let y = 0; y < srcH; y++) {
        const ySrc = y * srcW * 4;
        const yDst = y * dstW * 4;

        for (let x = 0; x < dstW; x++) {
            const center = (x + 0.5) * scale - 0.5;
            const left = Math.max(0, Math.floor(center - support));
            const right = Math.min(srcW - 1, Math.ceil(center + support));

            let r = 0, g = 0, b = 0, a = 0, wSum = 0;

            for (let i = left; i <= right; i++) {
                const w = lanczosWeight((i - center) * invScale);
                const idx = ySrc + i * 4;
                r += src[idx] * w;
                g += src[idx + 1] * w;
                b += src[idx + 2] * w;
                a += src[idx + 3] * w;
                wSum += w;
            }

            const dIdx = yDst + x * 4;
            if (wSum > 0) {
                const inv = 1 / wSum;
                out[dIdx] = r * inv;
                out[dIdx + 1] = g * inv;
                out[dIdx + 2] = b * inv;
                out[dIdx + 3] = a * inv;
            }
        }
    }

    return out;
}

function verticalPass(
    src: Float32Array, srcW: number, srcH: number, dstH: number,
): Uint8ClampedArray {
    const scale = srcH / dstH;
    const support = Math.max(A, A * scale);
    const invScale = scale > 1 ? 1 / scale : 1;
    const out = new Uint8ClampedArray(srcW * dstH * 4);

    for (let y = 0; y < dstH; y++) {
        const center = (y + 0.5) * scale - 0.5;
        const top = Math.max(0, Math.floor(center - support));
        const bottom = Math.min(srcH - 1, Math.ceil(center + support));

        for (let x = 0; x < srcW; x++) {
            let r = 0, g = 0, b = 0, a = 0, wSum = 0;

            for (let j = top; j <= bottom; j++) {
                const w = lanczosWeight((j - center) * invScale);
                const idx = (j * srcW + x) * 4;
                r += src[idx] * w;
                g += src[idx + 1] * w;
                b += src[idx + 2] * w;
                a += src[idx + 3] * w;
                wSum += w;
            }

            const dIdx = (y * srcW + x) * 4;
            if (wSum > 0) {
                const inv = 1 / wSum;
                out[dIdx] = Math.min(255, Math.max(0, Math.round(r * inv)));
                out[dIdx + 1] = Math.min(255, Math.max(0, Math.round(g * inv)));
                out[dIdx + 2] = Math.min(255, Math.max(0, Math.round(b * inv)));
                out[dIdx + 3] = Math.min(255, Math.max(0, Math.round(a * inv)));
            }
        }
    }

    return out;
}
