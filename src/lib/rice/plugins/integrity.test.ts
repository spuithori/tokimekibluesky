// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sha256Integrity, verifyIntegrity } from './integrity';

describe('sha256Integrity', () => {
    it('SRI 形式の sha256 ハッシュを返す', async () => {
        const integrity = await sha256Integrity('hello');
        expect(integrity).toBe('sha256-LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=');
    });

    it('verifyIntegrity は一致/不一致を判定する', async () => {
        const integrity = await sha256Integrity('export default {};');
        expect(await verifyIntegrity('export default {};', integrity)).toBe(true);
        expect(await verifyIntegrity('export default {}; ', integrity)).toBe(false);
        expect(await verifyIntegrity('export default {};', 'sha256-AAAA')).toBe(false);
    });
});
