import { describe, expect, it } from 'vitest';
import { escapeHtml, highlightLine, stripTags } from './highlight';
import { DEFAULT_RICE_CONFIG } from '$lib/settings/defaults';
import { blueskyMenuPreset } from '$lib/rice/presets';

const ADVERSARIAL_LINES = [
    'animation {',
    'bar "left" {',
    'statusbar {',
    '}',
    '$accent = #7aa2f7',
    'outline = 2px solid $accent',
    '# <b>&"comment" with $1 $& tokens',
    'name = a&b=c<d>"e"$2$&',
    'source = preset:bluesky-menu',
    'set design.darkmode = true',
    'bezier = smooth, 0.2, 0, 0, 1',
    '    items = account, home, "quoted", spacer',
    'columnrule "with $2 label" {',
    '!!! invalid line <>&"',
    '',
    '   ',
];

describe('rice config highlight', () => {
    it('不変条件: ハイライト結果のテキスト内容は常に原文のエスケープと一致する', () => {
        const corpus = [
            ...DEFAULT_RICE_CONFIG.split('\n'),
            ...blueskyMenuPreset.split('\n'),
            ...ADVERSARIAL_LINES,
        ];
        for (const raw of corpus) {
            expect(stripTags(highlightLine(raw, 1)), `line: ${JSON.stringify(raw)}`).toBe(escapeHtml(raw));
        }
    });

    it('回帰: ラベル無しセクション行でspan断片がテキスト化しない', () => {
        for (const raw of ['animation {', 'statusbar {', 'focus {']) {
            const html = highlightLine(raw, 1);
            expect(stripTags(html)).not.toContain('rc-section');
            expect(stripTags(html)).toBe(raw);
        }
    });

    it('セクション名とラベルに正しいクラスを付与する', () => {
        expect(highlightLine('bar "left" {', 1)).toBe(
            '<span class="rc-section">bar</span> <span class="rc-label">&quot;left&quot;</span> {',
        );
        expect(highlightLine('animation {', 1)).toBe('<span class="rc-section">animation</span> {');
        expect(highlightLine('}', 1)).toBe('}');
    });

    it('comment / var / set / source / entry / invalid のクラス付与', () => {
        expect(highlightLine('# hi', 1)).toBe('<span class="rc-comment"># hi</span>');
        expect(highlightLine('$a = 1', 1)).toBe('<span class="rc-var">$a </span>=<span class="rc-value"> 1</span>');
        expect(highlightLine('set a.b = 1', 1)).toBe('<span class="rc-keyword">set a.b </span>=<span class="rc-value"> 1</span>');
        expect(highlightLine('source = x', 1)).toBe('<span class="rc-keyword">source = x</span>');
        expect(highlightLine('    key = v', 1)).toBe('<span class="rc-key">    key </span>=<span class="rc-value"> v</span>');
        expect(highlightLine('!!!', 1)).toBe('<span class="rc-invalid">!!!</span>');
    });

    it('HTML特殊文字を含む値が正しくエスケープされる', () => {
        expect(highlightLine('key = <b>&"x"', 1)).toBe(
            '<span class="rc-key">key </span>=<span class="rc-value"> &lt;b&gt;&amp;&quot;x&quot;</span>',
        );
    });
});
