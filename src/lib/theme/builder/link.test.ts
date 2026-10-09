import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import type { ThemeRecord } from '../format';
import { DEFAULT_THEME } from '../builtin';
import { THEME_LINK_PREFIX, decodeThemeHash, encodeThemeHash } from './link';
import { builderHref, sourceFromUrl } from './session';

const blob = { $type: 'blob', ref: { $link: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku' }, mimeType: 'image/png', size: 1000 };

function rawHash(value: unknown): string {
    return THEME_LINK_PREFIX + gzipSync(JSON.stringify(value)).toString('base64url');
}

describe('テーマのリンク', () => {
    it('リンクにしたテーマは、トークン・ダーク・色の選択肢がそのまま戻る', async () => {
        const record = await decodeThemeHash(await encodeThemeHash(DEFAULT_THEME));
        expect(record?.name).toBe(DEFAULT_THEME.name);
        expect(record?.tokens).toEqual(DEFAULT_THEME.tokens);
        expect(record?.dark).toEqual(DEFAULT_THEME.dark);
        expect(record?.variants).toEqual(DEFAULT_THEME.variants);
    });

    it('画像はリンクに含めない', async () => {
        const withImages: ThemeRecord = { ...DEFAULT_THEME, thumbnail: blob as never, cover: blob as never, images: [{ key: 'bg', image: blob as never }] };
        const record = await decodeThemeHash(await encodeThemeHash(withImages));
        expect(record).not.toBeNull();
        expect(record?.thumbnail).toBeUndefined();
        expect(record?.cover).toBeUndefined();
        expect(record?.images).toBeUndefined();
    });

    it('公開時と同じ検証を通らない中身は読み込まない', async () => {
        const external = { ...DEFAULT_THEME, tokens: [{ name: '--base-bg-image', value: 'url(https://example.com/a.png)' }] };
        expect(await decodeThemeHash(rawHash(external))).toBeNull();
        expect(await decodeThemeHash(rawHash({ name: 'x' }))).toBeNull();
        expect(await decodeThemeHash(`${THEME_LINK_PREFIX}not-gzip`)).toBeNull();
        expect(await decodeThemeHash('#other=1')).toBeNull();
    });

    it('リンクは始め方としてビルダーの URL と行き来できる', async () => {
        const hash = await encodeThemeHash(DEFAULT_THEME);
        const href = builderHref({ kind: 'link', hash });
        expect(sourceFromUrl(new URL(href, 'https://t.test'))).toEqual({ kind: 'link', hash });
        expect(sourceFromUrl(new URL('/theme-store/builder?draft=abc', 'https://t.test'))).toEqual({ kind: 'draft', id: 'abc' });
    });
});
