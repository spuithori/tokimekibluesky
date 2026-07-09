import { describe, expect, it } from 'vitest';
import { appearanceKnobs } from './knobs';
import { compile } from './config/compile';

function knob(id: string) {
    const found = appearanceKnobs.find((k) => k.id === id);
    if (!found) throw new Error(`unknown knob: ${id}`);
    return found;
}

describe('appearanceKnobs write', () => {
    it('shell-width は layout.shellwidth を書き込み compiled から読み戻せる', () => {
        const next = knob('shell-width').write('', '1240px');
        const compiled = compile(next);
        expect(compiled.diagnostics).toEqual([]);
        expect(knob('shell-width').read(compiled)).toBe('1240px');
    });

    it('shell-centered ON は align 未設定なら align = center も書く', () => {
        const next = knob('shell-centered').write('', 'centered');
        const compiled = compile(next);
        expect(compiled.layout?.shell).toBe('centered');
        expect(compiled.layout?.align).toBe('center');

        const keepAlign = knob('shell-centered').write('layout {\n    align = right\n}\n', 'centered');
        expect(compile(keepAlign).layout?.align).toBe('right');

        const off = knob('shell-centered').write(next, 'none');
        expect(compile(off).layout?.shell).toBe('none');
    });

    it('token 系ノブは theme > tokens に書き込む', () => {
        let config = knob('deck-radius').write('', '16px');
        config = knob('decks-gap').write(config, '8px');
        config = knob('accent').write(config, '#1083fe');
        const compiled = compile(config);
        expect(compiled.diagnostics).toEqual([]);
        expect(compiled.themeTokens['deck-border-radius']).toBe('16px');
        expect(compiled.themeTokens['decks-gap']).toBe('8px');
        expect(compiled.themeTokens['current-theme-color']).toBe('#1083fe');
    });

    it('source 参照 config への書き込みは後置追記でオーバーライドになる', () => {
        const base = 'source = preset:bluesky-shell\n';
        const next = knob('shell-width').write(base, '1400px');
        expect(next.startsWith(base.trim())).toBe(true);
        const compiled = compile(next, (ref) => (ref === 'preset:bluesky-shell' ? 'layout {\n    shellwidth = 1240px\n}\n' : undefined));
        expect(compiled.layout?.shellWidth).toBe('1400px');
    });

    it('tile トグルは layout.mode を往復できる', () => {
        const on = knob('tile').write('', 'tile');
        expect(compile(on).layout?.mode).toBe('tile');
        const off = knob('tile').write(on, 'scroll');
        expect(compile(off).layout?.mode).toBe('scroll');
        expect(off.match(/mode/g)?.length).toBe(1);
    });
});
