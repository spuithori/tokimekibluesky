import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal(
    'Worker',
    class {
        postMessage() {}
        terminate() {}
        addEventListener() {}
        removeEventListener() {}
    },
);

const { barItemOptions } = await import('./barItems');
type BarItemResolved = import('./barItems').BarItemResolved;

const component = (options: Record<string, string>): BarItemResolved => ({
    kind: 'component',
    loader: async () => ({ default: (() => {}) as never }),
    getOptions: () => options,
});

describe('barItemOptions', () => {
    it('plugin セクションの options を既定として渡す', () => {
        expect(barItemOptions(component({ intensity: '0.4' }), {})).toEqual({ intensity: '0.4' });
    });

    it('配置サイトの per-item options が plugin セクションを上書きする', () => {
        expect(barItemOptions(component({ intensity: '0.4', label: 'a' }), { intensity: '0.9' })).toEqual({
            intensity: '0.9',
            label: 'a',
        });
    });

    it('getOptions を持たない項目(ビルトイン)では per-item options をそのまま返す', () => {
        const builtin: BarItemResolved = { kind: 'component', loader: async () => ({ default: (() => {}) as never }) };
        const spec = { size: '16' };
        expect(barItemOptions(builtin, spec)).toBe(spec);
    });

    it('解決できなかった項目でも per-item options を返す', () => {
        const spec = { size: '16' };
        expect(barItemOptions(undefined, spec)).toBe(spec);
    });

    it('spacer など getOptions を持ち得ない種別でも壊れない', () => {
        expect(barItemOptions({ kind: 'spacer' }, { a: '1' })).toEqual({ a: '1' });
    });
});
