/**
 * Block-based luminance SSIM (Structural Similarity Index).
 * Automatically subsamples large images for performance.
 * Returns a value between 0 and 1 where 1 = identical.
 */
export function computeSSIM(
    ref: Uint8ClampedArray,
    enc: Uint8ClampedArray,
    width: number,
    height: number,
): number {
    // Subsample for performance — keep effective resolution <= 256×256
    const maxDim = 256;
    const step = Math.max(1, Math.floor(Math.max(width, height) / maxDim));
    const sw = Math.floor(width / step);
    const sh = Math.floor(height / step);

    // Extract luminance (BT.601) at subsampled positions
    const n = sw * sh;
    const lum1 = new Float32Array(n);
    const lum2 = new Float32Array(n);

    for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
            const idx = ((y * step) * width + (x * step)) * 4;
            const i = y * sw + x;
            lum1[i] = 0.299 * ref[idx] + 0.587 * ref[idx + 1] + 0.114 * ref[idx + 2];
            lum2[i] = 0.299 * enc[idx] + 0.587 * enc[idx + 1] + 0.114 * enc[idx + 2];
        }
    }

    // Block-based SSIM
    const blockSize = 8;
    const blocksX = Math.floor(sw / blockSize);
    const blocksY = Math.floor(sh / blockSize);

    if (blocksX === 0 || blocksY === 0) return 1;

    const L = 255;
    const c1 = (0.01 * L) ** 2; // 6.5025
    const c2 = (0.03 * L) ** 2; // 58.5225

    let ssimSum = 0;

    for (let by = 0; by < blocksY; by++) {
        for (let bx = 0; bx < blocksX; bx++) {
            let s1 = 0, s2 = 0, s1sq = 0, s2sq = 0, s12 = 0;
            const count = blockSize * blockSize;

            for (let dy = 0; dy < blockSize; dy++) {
                const row = (by * blockSize + dy) * sw + bx * blockSize;
                for (let dx = 0; dx < blockSize; dx++) {
                    const l1 = lum1[row + dx];
                    const l2 = lum2[row + dx];
                    s1 += l1;
                    s2 += l2;
                    s1sq += l1 * l1;
                    s2sq += l2 * l2;
                    s12 += l1 * l2;
                }
            }

            const mu1 = s1 / count;
            const mu2 = s2 / count;
            const sigma1sq = s1sq / count - mu1 * mu1;
            const sigma2sq = s2sq / count - mu2 * mu2;
            const sigma12 = s12 / count - mu1 * mu2;

            ssimSum += ((2 * mu1 * mu2 + c1) * (2 * sigma12 + c2)) /
                       ((mu1 * mu1 + mu2 * mu2 + c1) * (sigma1sq + sigma2sq + c2));
        }
    }

    return ssimSum / (blocksX * blocksY);
}
