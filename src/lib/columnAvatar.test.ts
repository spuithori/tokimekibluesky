import { describe, it, expect } from 'vitest';
import { AVATAR_ICON, applyDefaultColumnIcon, columnAvatarSrc } from './columnAvatar';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import type { Column } from '$lib/types/column';

function column(algorithm: Column['algorithm']): Column {
    return {
        id: 'c1',
        algorithm,
        style: 'default',
        settings: defaultDeckSettings,
        did: 'did:plc:test',
        data: { feed: [], cursor: '' },
    };
}

const AVATAR = 'https://cdn.bsky.app/img/avatar/plain/did:plc:test/bafkrei@jpeg';

describe('applyDefaultColumnIcon', () => {
    it('既定=avatar かつアバター有りのカスタムフィードは icon を avatar にする', () => {
        const result = applyDefaultColumnIcon(column({ type: 'custom', algorithm: 'at://x', avatar: AVATAR }), 'avatar');
        expect(result.settings.icon).toBe(AVATAR_ICON);
    });

    it('共有の defaultDeckSettings を破壊しない', () => {
        applyDefaultColumnIcon(column({ type: 'custom', algorithm: 'at://x', avatar: AVATAR }), 'avatar');
        expect(defaultDeckSettings.icon).toBeNull();
    });

    it('既定=icon なら何も変えない', () => {
        const result = applyDefaultColumnIcon(column({ type: 'custom', algorithm: 'at://x', avatar: AVATAR }), 'icon');
        expect(result.settings).toBe(defaultDeckSettings);
    });

    it('アバター無しのフィードは何も変えない', () => {
        const result = applyDefaultColumnIcon(column({ type: 'custom', algorithm: 'at://x' }), 'avatar');
        expect(result.settings).toBe(defaultDeckSettings);
    });

    it('カスタムフィード以外は何も変えない', () => {
        const result = applyDefaultColumnIcon(column({ type: 'officialList', algorithm: 'at://x', avatar: AVATAR }), 'avatar');
        expect(result.settings).toBe(defaultDeckSettings);
    });
});

describe('columnAvatarSrc', () => {
    it('plain をサムネイル変種へ置換する', () => {
        expect(columnAvatarSrc(AVATAR)).toBe('https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:test/bafkrei@jpeg');
    });

    it('CDN 形式以外はそのまま返す', () => {
        expect(columnAvatarSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
    });
});
