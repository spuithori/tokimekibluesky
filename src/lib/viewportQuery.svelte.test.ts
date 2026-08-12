import { describe, it, expect, vi } from 'vitest';

describe('viewportQuery (モバイル判定の共有 MediaQuery)', () => {
    it('(max-width: 767px) を購読し、current が matchMedia の結果を反映する', async () => {
        const queries: string[] = [];
        vi.stubGlobal('matchMedia', (q: string) => {
            queries.push(q);
            return {
                matches: true,
                media: q,
                onchange: null,
                addEventListener: () => {},
                removeEventListener: () => {},
                addListener: () => {},
                removeListener: () => {},
                dispatchEvent: () => false,
            };
        });

        const { isMobileViewport } = await import('$lib/viewportQuery.svelte');

        expect(isMobileViewport.current).toBe(true);
        expect(queries.some(q => q.includes('max-width: 767px'))).toBe(true);

        vi.unstubAllGlobals();
    });
});
