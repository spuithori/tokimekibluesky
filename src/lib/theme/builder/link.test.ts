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
        const record = (await decodeThemeHash(await encodeThemeHash(DEFAULT_THEME)))?.record;
        expect(record?.name).toBe(DEFAULT_THEME.name);
        expect(record?.tokens).toEqual(DEFAULT_THEME.tokens);
        expect(record?.dark).toEqual(DEFAULT_THEME.dark);
        expect(record?.variants).toEqual(DEFAULT_THEME.variants);
    });

    it('画像はリンクに含めない', async () => {
        const withImages: ThemeRecord = { ...DEFAULT_THEME, thumbnail: blob as never, cover: blob as never, images: [{ key: 'bg', image: blob as never }] };
        const link = await decodeThemeHash(await encodeThemeHash(withImages));
        expect(link).not.toBeNull();
        expect(link?.record.thumbnail).toBeUndefined();
        expect(link?.record.cover).toBeUndefined();
        expect(link?.record.images).toBeUndefined();
        expect(link?.images).toEqual({});
    });

    it('画像を渡したリンクは、画像ごと戻り theme-image() の参照が通る', async () => {
        const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4]);
        const record: ThemeRecord = { ...DEFAULT_THEME, tokens: [...DEFAULT_THEME.tokens, { name: '--base-bg-image', value: 'theme-image(background)' }] };
        const link = await decodeThemeHash(await encodeThemeHash(record, [{ key: 'background', mimeType: 'image/webp', bytes }]));
        expect(link?.record.images?.map((i) => i.key)).toEqual(['background']);
        expect(link?.images.background.type).toBe('image/webp');
        expect(link?.images.background.size).toBe(bytes.length);
    });

    it('画像の無い参照・不正な画像は読み込まない', async () => {
        const record = { ...DEFAULT_THEME, tokens: [{ name: '--base-bg-image', value: 'theme-image(background)' }] };
        expect(await decodeThemeHash(rawHash(record))).toBeNull();
        expect(await decodeThemeHash(rawHash({ ...record, linkImages: [{ key: 'background', mimeType: 'image/svg+xml', data: 'AAAA' }] }))).toBeNull();
        expect(await decodeThemeHash(rawHash({ ...record, linkImages: [{ key: 'background', mimeType: 'image/png', data: '' }] }))).toBeNull();
        expect(await decodeThemeHash(rawHash({ ...record, linkImages: [{ key: 'a b', mimeType: 'image/png', data: 'AAAA' }] }))).toBeNull();
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
