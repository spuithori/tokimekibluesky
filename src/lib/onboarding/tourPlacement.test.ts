import { describe, it, expect } from 'vitest';
import { placeTooltip, spotlightRect } from './tourPlacement';

const viewport = { width: 1280, height: 800 };
const tooltip = { width: 300, height: 140 };

describe('spotlightRect', () => {
    it('expands the target by the padding on every side', () => {
        expect(spotlightRect({ top: 10, left: 20, width: 30, height: 40 }, 8)).toEqual({ top: 2, left: 12, width: 46, height: 56 });
    });
});

describe('placeTooltip', () => {
    it('centers the tooltip when there is no target', () => {
        const placement = placeTooltip(null, tooltip, viewport);
        expect(placement.side).toBe('center');
        expect(placement.left).toBe((1280 - 300) / 2);
        expect(placement.top).toBe((800 - 140) / 2);
    });

    it('prefers the right side of a narrow target on desktop', () => {
        const placement = placeTooltip({ top: 100, left: 10, width: 44, height: 44 }, tooltip, viewport);
        expect(placement.side).toBe('right');
        expect(placement.left).toBe(10 + 44 + 14);
        expect(placement.arrowOffset).toBeGreaterThanOrEqual(18);
    });

    it('falls below a wide target and clamps inside the viewport', () => {
        const placement = placeTooltip({ top: 40, left: 0, width: 1280, height: 60 }, tooltip, viewport);
        expect(placement.side).toBe('bottom');
        expect(placement.top).toBe(40 + 60 + 14);
        expect(placement.left).toBe((1280 - 300) / 2);
    });

    it('flips above when there is no room below', () => {
        const placement = placeTooltip({ top: 720, left: 0, width: 1280, height: 60 }, tooltip, viewport);
        expect(placement.side).toBe('top');
        expect(placement.top).toBe(720 - 140 - 14);
    });

    it('never places the tooltip outside a phone viewport', () => {
        const phone = { width: 390, height: 700 };
        const placement = placeTooltip({ top: 8, left: 340, width: 40, height: 40 }, { width: 340, height: 160 }, phone);
        expect(placement.side).toBe('bottom');
        expect(placement.left + 340).toBeLessThanOrEqual(390 - 12);
        expect(placement.left).toBeGreaterThanOrEqual(12);
        expect(placement.arrowOffset).toBeLessThanOrEqual(340 - 18);
    });
});
