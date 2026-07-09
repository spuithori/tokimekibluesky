import { describe, it, expect } from 'vitest';
import { removeSectionInText } from './edit';
import { compile } from './compile';

const CONFIG = `source = preset:cyberdeck

theme {
    tokens {
        accent = #ff0000
    }
}

plugin:aurora {
    enable = true
    intensity = 0.9
}

plugin:mochott {
    enable = true
}

layout {
    style = single
}
`;

describe('removeSectionInText', () => {
    it('プラグインのセクションだけを除去する', () => {
        const next = removeSectionInText(CONFIG, { name: 'plugin:aurora' });
        expect(next).not.toContain('plugin:aurora');
        expect(next).toContain('plugin:mochott');
        expect(next).toContain('theme {');
        expect(next).toContain('layout {');
        expect(next).toContain('source = preset:cyberdeck');
    });

    it('除去後も config がコンパイルでき、診断が増えない', () => {
        const before = compile(CONFIG).diagnostics.length;
        const next = removeSectionInText(CONFIG, { name: 'plugin:aurora' });
        const out = compile(next);
        expect(out.diagnostics).toHaveLength(before);
        expect(out.plugins['aurora']).toBeUndefined();
        expect(out.plugins['mochott']?.enable).toBe(true);
        expect(out.layout?.style).toBe('single');
        expect(out.themeTokens['accent']).toBe('#ff0000');
    });

    it('存在しないセクションでは何も変えない', () => {
        expect(removeSectionInText(CONFIG, { name: 'plugin:nope' })).toBe(CONFIG);
    });

    it('後続の空行を1つだけ吸収し、次のセクションを巻き込まない', () => {
        const next = removeSectionInText(CONFIG, { name: 'plugin:aurora' });
        expect(next).not.toContain('\n\n\n');
        expect(next.split('plugin:mochott')).toHaveLength(2);
    });

    it('末尾のセクションを除去できる', () => {
        const text = 'theme {\n    reset = true\n}\n\nplugin:aurora {\n    enable = true\n}\n';
        const next = removeSectionInText(text, { name: 'plugin:aurora' });
        expect(next).not.toContain('plugin:aurora');
        expect(compile(next).themeReset).toBe(true);
    });

    it('先頭のセクションを除去できる', () => {
        const text = 'plugin:aurora {\n    enable = true\n}\n\nlayout {\n    style = deck\n}\n';
        const next = removeSectionInText(text, { name: 'plugin:aurora' });
        expect(next.trimStart().startsWith('layout')).toBe(true);
        expect(compile(next).layout?.style).toBe('deck');
    });

    it('同名セクションが複数あるとき最後の1つを除去する(setValueInText と同じ後勝ち規則)', () => {
        const text = 'plugin:aurora {\n    intensity = 0.1\n}\n\nplugin:aurora {\n    intensity = 0.9\n}\n';
        const next = removeSectionInText(text, { name: 'plugin:aurora' });
        expect(next).toContain('intensity = 0.1');
        expect(next).not.toContain('intensity = 0.9');
    });
});
