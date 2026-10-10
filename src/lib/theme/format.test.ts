import { describe, expect, it } from 'vitest';
import { checkTokenValue, compileThemeStyle, type ThemeRecord } from './format';
import { validateThemeRecord } from './validate';

const blob = (mimeType = 'image/png', size = 1000) => ({ $type: 'blob', ref: { $link: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku' }, mimeType, size });

function finalValues(style: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const decl of style.split(';').filter(Boolean)) {
        const i = decl.indexOf(':');
        map.set(decl.slice(0, i), decl.slice(i + 1));
    }
    return map;
}

describe('checkTokenValue', () => {
    it.each([
        'url(https://example.com/a.png)',
        'var(--x, url(https://example.com/a.png))',
        'image-set("a.png" 1x)',
        'IMAGE("a.png")',
        'attr(data-x)',
        'element(#id)',
        'paint(worklet)',
        'src("a.png")',
        'expression(alert(1))',
    ])('外部の読み込みや DOM の読み取りができる関数を拒否する: %s', (value) => {
        expect(checkTokenValue(value)).not.toBeNull();
    });

    it.each([
        'red;background:url(x)',
        'red}body{color:red',
        'red !important',
        '\\75 rl(x)',
        'red /* c */',
        '@import "x"',
        'calc(1px + (2px)',
        '"unterminated',
        'red\nblue',
    ])('宣言の外へ出られる・解釈をずらせる値を拒否する: %s', (value) => {
        expect(checkTokenValue(value)).not.toBeNull();
    });

    it.each([
        '#f182ac',
        'var(--primary-color)',
        'color-mix(in srgb, #180e30 10%, transparent)',
        'linear-gradient(165deg,rgba(255,255,255,1) 0%,rgba(255,255,255,0) 50%)',
        '0 .25px .75px rgba(0,0,0,.03),0 2px 6px rgba(0,0,0,.05)',
        'blur(20px) saturate(1.8)',
        'calc(100dvh - var(--decks-margin, 0px))',
        '"Noto Sans JP", sans-serif',
        'oklch(from var(--primary-color) l c h / 50%)',
    ])('テーマで使う通常の値は通す: %s', (value) => {
        expect(checkTokenValue(value)).toBeNull();
    });

    it('theme-image は存在する画像キーだけを参照できる', () => {
        expect(checkTokenValue('theme-image(bg)', new Set(['bg']))).toBeNull();
        expect(checkTokenValue('theme-image(other)', new Set(['bg']))).not.toBeNull();
        expect(checkTokenValue('theme-image(bg)')).not.toBeNull();
    });
});

describe('validateThemeRecord', () => {
    const base = { name: 'T', version: '1', createdAt: '2026-01-01T00:00:00.000Z', tokens: [{ name: '--a', value: 'red' }] };

    it('知らないフィールドを落とす', () => {
        const result = validateThemeRecord({ ...base, script: 'alert(1)', options: { x: 1 } });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.record).not.toHaveProperty('script');
            expect(result.record).not.toHaveProperty('options');
        }
    });

    it('不正なトークンが1つでもあれば厳格な検証では導入させない', () => {
        expect(validateThemeRecord({ ...base, tokens: [{ name: '--a', value: 'url(x)' }] }).ok).toBe(false);
        expect(validateThemeRecord({ ...base, tokens: [{ name: 'color', value: 'red' }] }).ok).toBe(false);
    });

    it('寛容な検証では不正なトークンだけを除いて残す', () => {
        const result = validateThemeRecord({ ...base, tokens: [{ name: '--a', value: 'url(x)' }, { name: '--b', value: 'blue' }] }, { strict: false });
        expect(result.ok && result.record.tokens).toEqual([{ name: '--b', value: 'blue' }]);
    });

    it('画像 blob は許可した形式・サイズ・raw CID だけを受け付ける', () => {
        expect(validateThemeRecord({ ...base, images: [{ key: 'bg', image: blob() }] }).ok).toBe(true);
        expect(validateThemeRecord({ ...base, images: [{ key: 'bg', image: blob('image/svg+xml') }] }).ok).toBe(false);
        expect(validateThemeRecord({ ...base, images: [{ key: 'bg', image: blob('image/png', 3_000_000) }] }).ok).toBe(false);
        expect(validateThemeRecord({ ...base, images: [{ key: 'bg', image: { ...blob(), ref: { $link: 'javascript:x' } } }] }).ok).toBe(false);
    });

    it('スクリーンショットは種類ごとに1枚、知らない種類は落とし、壊れたものは導入させない', () => {
        const shot = (kind: string, extra: Record<string, unknown> = {}) => ({ kind, image: blob('image/webp'), aspectRatio: { width: 1440, height: 900 }, ...extra });
        const ok = validateThemeRecord({ ...base, screenshots: [shot('desktop-light'), shot('mobile-dark'), shot('tablet-sepia')] });
        expect(ok.ok && ok.record.screenshots?.map((s) => s.kind)).toEqual(['desktop-light', 'mobile-dark']);
        expect(validateThemeRecord({ ...base, screenshots: [shot('desktop-light'), shot('desktop-light')] }).ok).toBe(false);
        expect(validateThemeRecord({ ...base, screenshots: [shot('desktop-light', { aspectRatio: { width: 0, height: 900 } })] }).ok).toBe(false);
        expect(validateThemeRecord({ ...base, screenshots: [shot('desktop-light', { image: blob('image/webp', 2_000_000) })] }).ok).toBe(false);
    });
});

describe('compileThemeStyle', () => {
    const record: ThemeRecord = {
        name: 'T',
        version: '1',
        createdAt: '',
        tokens: [{ name: '--a', value: 'base' }, { name: '--b', value: 'base' }, { name: '--c', value: 'base' }],
        variants: [
            { key: 'one', name: 'One', swatch: '#000', tokens: [{ name: '--b', value: 'one' }] },
            { key: 'two', name: 'Two', swatch: '#fff', tokens: [{ name: '--b', value: 'two' }, { name: '--c', value: 'two' }] },
        ],
        dark: [{ name: '--c', value: 'dark' }],
    };

    it('基本 → 選んだ色 → ダークの順に上書きされる', () => {
        const values = finalValues(compileThemeStyle(record, { variant: 'two', dark: true }));
        expect(values.get('--a')).toBe('base');
        expect(values.get('--b')).toBe('two');
        expect(values.get('--c')).toBe('dark');
    });

    it('存在しない色を選んでいれば先頭の色を使う', () => {
        expect(finalValues(compileThemeStyle(record, { variant: 'gone', dark: false })).get('--b')).toBe('one');
    });

    it('theme-image を保存済み blob の URL に置き換え、無ければ none にする', () => {
        const withImage: ThemeRecord = { ...record, tokens: [{ name: '--img', value: 'theme-image(bg), linear-gradient(red, blue)' }] };
        expect(compileThemeStyle(withImage, { dark: false, imageUrls: { bg: 'blob:https://tokimeki.blue/1' } })).toContain('--img:url("blob:https://tokimeki.blue/1"), linear-gradient(red, blue);');
        expect(compileThemeStyle(withImage, { dark: false })).toContain('--img:none, linear-gradient(red, blue);');
    });
});
