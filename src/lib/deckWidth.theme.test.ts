import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resolveDeckWidthPx, resolveSingleWidthPx } from './deckWidth';

const css = readFileSync(resolve(process.cwd(), 'src/routes/theme.css'), 'utf-8');

function cssVarPx(name: string): number {
    const m = css.match(new RegExp(`${name}:\\s*(\\d+)px`));
    if (!m) throw new Error(`theme.css に ${name} の px 定義が見つかりません`);
    return Number(m[1]);
}

const DECK_VARS: Record<string, string> = {
    xxs: '--deck-xxs-width',
    xs: '--deck-xs-width',
    small: '--deck-s-width',
    medium: '--deck-m-width',
    large: '--deck-l-width',
    xl: '--deck-xl-width',
    xxl: '--deck-xxl-width',
};

const SINGLE_VARS: Record<string, string> = {
    xxs: '--single-xxs-width',
    xs: '--single-xs-width',
    small: '--single-s-width',
    medium: '--single-m-width',
    large: '--single-l-width',
    xl: '--single-xl-width',
    xxl: '--single-xxl-width',
};

describe('プリセット幅の二重定義ガード: deckWidth.ts と theme.css の一致', () => {
    it.each(Object.entries(DECK_VARS))('deck preset "%s" は %s と一致', (preset, varName) => {
        expect(resolveDeckWidthPx(preset)).toBe(cssVarPx(varName));
    });

    it.each(Object.entries(SINGLE_VARS))('single preset "%s" は %s と一致', (preset, varName) => {
        expect(resolveSingleWidthPx(preset)).toBe(cssVarPx(varName));
    });
});
