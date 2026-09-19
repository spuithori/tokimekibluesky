import { describe, it, expect } from 'vitest';
import { COLUMN_ICON_CRITERIA, pickColumnIcon } from './columnIcon';
import { iconMap } from '$lib/columnIcons';

describe('COLUMN_ICON_CRITERIA', () => {
    it('none 以外の全選択肢が iconMap に実在する', () => {
        const missing = Object.keys(COLUMN_ICON_CRITERIA).filter(key => key !== 'none' && !iconMap.has(key));
        expect(missing).toEqual([]);
    });
});

describe('pickColumnIcon', () => {
    it('しきい値以上の選択肢を返す', () => {
        expect(pickColumnIcon('cat', 0.7)).toBe('cat');
        expect(pickColumnIcon('cat', 1)).toBe('cat');
    });

    it('しきい値未満・none・確率なしは null', () => {
        expect(pickColumnIcon('cat', 0.69)).toBeNull();
        expect(pickColumnIcon('none', 0.99)).toBeNull();
        expect(pickColumnIcon('cat', undefined)).toBeNull();
    });
});
