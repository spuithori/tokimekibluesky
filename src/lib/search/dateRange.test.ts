import { describe, it, expect } from 'vitest';
import { toDateInputValue, presetSince } from './dateRange';

describe('dateRange', () => {
    it('formats dates as yyyy-mm-dd with zero padding', () => {
        expect(toDateInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(toDateInputValue(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('computes preset since dates relative to now', () => {
        const now = new Date(2026, 6, 10);
        expect(presetSince('day', now)).toBe('2026-07-09');
        expect(presetSince('week', now)).toBe('2026-07-03');
        expect(presetSince('month', now)).toBe('2026-06-10');
        expect(presetSince('year', now)).toBe('2025-07-10');
    });

    it('rolls over month boundaries', () => {
        expect(presetSince('week', new Date(2026, 2, 3))).toBe('2026-02-24');
        expect(presetSince('day', new Date(2026, 0, 1))).toBe('2025-12-31');
    });
});
