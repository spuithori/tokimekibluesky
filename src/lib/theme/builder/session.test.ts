import { describe, expect, it } from 'vitest';
import { builderHref, draftSignature, editDraftId, sourceFromParams, type BuilderSource } from './session';
import { draftFromDefault, draftFromRecord } from './start';

describe('始め方の URL', () => {
    it('始め方は URL と行き来でき、指定が無ければ既定のテーマから', () => {
        const sources: BuilderSource[] = [
            { kind: 'draft', id: 'abc' },
            { kind: 'default' },
            { kind: 'installed', id: 'at://did:plc:x/tech.tokimeki.theme.theme/a' },
            { kind: 'own', uri: 'at://did:plc:me/tech.tokimeki.theme.theme/mine' },
        ];
        for (const source of sources) {
            expect(sourceFromParams(new URL(builderHref(source), 'https://t.test').searchParams)).toEqual(source);
        }
        expect(sourceFromParams(new URLSearchParams())).toEqual({ kind: 'default' });
        expect(sourceFromParams(new URLSearchParams('from=installed'))).toEqual({ kind: 'default' });
    });

    it('自分のテーマの下書きの ID はテーマごとに1つに決まる', () => {
        const uri = 'at://did:plc:me/tech.tokimeki.theme.theme/mine';
        expect(editDraftId(uri)).toBe(editDraftId(uri));
        expect(editDraftId(uri)).not.toBe(editDraftId(`${uri}2`));
    });
});

describe('編集したかどうかの判定', () => {
    it('ID・更新時刻・公開先が変わっても、中身が同じなら同じ署名', () => {
        const draft = draftFromDefault('A');
        const before = draftSignature(draft);
        expect(draftSignature({ ...draft, id: 'other', updatedAt: '2030-01-01T00:00:00.000Z', sourceUri: 'at://x/y/z', rkey: 'z' })).toBe(before);
    });

    it('かんたん・詳細・情報・画像のどれを変えても署名が変わる', () => {
        const draft = draftFromDefault('A');
        const before = draftSignature(draft);
        const blob = new Blob(['x'], { type: 'image/png' });
        for (const patch of [
            { seeds: { accent: '#123456' } },
            { overrides: { '--bg-color-1': '#000000' } },
            { darkOverrides: { '--bg-color-1': null } },
            { name: 'B' },
            { description: 'd' },
            { version: '2.0' },
            { images: [{ key: 'background', blob }] },
        ]) {
            expect(draftSignature({ ...draft, ...patch })).not.toBe(before);
        }
    });

    it('同じ中身の別の画像は別のものとして扱う', () => {
        const record = draftFromRecord({ name: 'A', version: '1', createdAt: '2026-01-01T00:00:00.000Z', tokens: [] }, undefined);
        const a = { ...record, images: [{ key: 'bg', blob: new Blob(['x']) }] };
        const b = { ...record, images: [{ key: 'bg', blob: new Blob(['x']) }] };
        expect(draftSignature(a)).not.toBe(draftSignature(b));
        expect(draftSignature(a)).toBe(draftSignature({ ...a }));
    });
});
