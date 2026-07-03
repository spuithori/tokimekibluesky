import { describe, it, expect, beforeEach } from 'vitest';
import {
    buildPublishColumn,
    findPublishColumn,
    readLegacyPublishPrefs,
    presetForLegacyLayout,
    getPreferredPreset,
    setPreferredPreset,
    hasStoredPreset,
    savePublishColumnSettings,
    readPublishColumnSettings,
} from './publishColumnCore';

beforeEach(() => {
    localStorage.clear();
});

describe('buildPublishColumn', () => {
    it('tile: 340px幅の非ポップアップカラムを構築', () => {
        const column = buildPublishColumn({ id: 'p1', name: 'Post', did: 'did:plc:x', preset: 'tile' });
        expect(column.algorithm).toEqual({ type: 'publish', name: 'Post' });
        expect(column.settings.width).toBe(340);
        expect(column.settings.isPopup).toBe(false);
        expect(column.settings.popupPreset).toBeUndefined();
        expect(column.data).toEqual({ feed: [], cursor: '' });
        expect(column.did).toBe('did:plc:x');
    });

    it('center: フロート窓+中央プリセット+600x560', () => {
        const column = buildPublishColumn({ id: 'p1', name: 'Post', preset: 'center' });
        expect(column.settings.isPopup).toBe(true);
        expect(column.settings.popupPreset).toBe('center');
        expect(column.settings.popupPosition).toEqual({ x: 0, y: 0, width: 600, height: 560 });
        expect(column.did).toBe('');
    });

    it('bottom: フロート窓+下部プリセット+740x340', () => {
        const column = buildPublishColumn({ id: 'p1', name: 'Post', preset: 'bottom' });
        expect(column.settings.isPopup).toBe(true);
        expect(column.settings.popupPreset).toBe('bottom');
        expect(column.settings.popupPosition).toEqual({ x: 0, y: 0, width: 740, height: 340 });
    });

    it('settings は共有参照でない(呼び出しごとに独立)', () => {
        const a = buildPublishColumn({ id: 'a', name: 'Post' });
        const b = buildPublishColumn({ id: 'b', name: 'Post' });
        a.settings.width = 999;
        expect(b.settings.width).toBe(340);
    });

    it('settings 復元: 保存済み settings を使い共有参照でない', () => {
        const saved = { width: 500, isPopup: true, popupPreset: 'center', popupPosition: { x: 20, y: 30, width: 600, height: 560 } };
        const column = buildPublishColumn({ id: 'p1', name: 'Post', settings: saved });
        expect(column.settings.width).toBe(500);
        expect(column.settings.isPopup).toBe(true);
        expect(column.settings.popupPreset).toBe('center');
        expect(column.settings.popupPosition).toEqual({ x: 20, y: 30, width: 600, height: 560 });
        column.settings.width = 999;
        expect(saved.width).toBe(500);
    });
});

describe('findPublishColumn', () => {
    it('publish type のカラムを返す・無ければ undefined', () => {
        const pub = buildPublishColumn({ id: 'p', name: 'Post' });
        const other = { id: 'a', algorithm: { type: 'default' } } as any;
        expect(findPublishColumn([other, pub])?.id).toBe('p');
        expect(findPublishColumn([other])).toBeUndefined();
        expect(findPublishColumn([null as any, undefined as any, pub])?.id).toBe('p');
    });
});

describe('readLegacyPublishPrefs', () => {
    it('layout/pinned を読む', () => {
        localStorage.setItem('layout', 'popup');
        localStorage.setItem('pinned', 'true');
        expect(readLegacyPublishPrefs()).toEqual({ layout: 'popup', pinned: true });
    });

    it('不正な layout は null・壊れた pinned は false', () => {
        localStorage.setItem('layout', 'weird');
        localStorage.setItem('pinned', '{broken json');
        expect(readLegacyPublishPrefs()).toEqual({ layout: null, pinned: false });
    });

    it('未設定は layout null / pinned false', () => {
        expect(readLegacyPublishPrefs()).toEqual({ layout: null, pinned: false });
    });
});

describe('publish column settings storage', () => {
    it('save/read ラウンドトリップ', () => {
        const settings = { width: 340, isPopup: true, popupPreset: 'bottom', popupPosition: { x: 1, y: 2, width: 740, height: 340 } };
        savePublishColumnSettings(settings);
        expect(readPublishColumnSettings()).toEqual(settings);
    });

    it('未設定は null / 壊れた JSON は null', () => {
        expect(readPublishColumnSettings()).toBeNull();
        localStorage.setItem('publishColumnSettings', '{broken');
        expect(readPublishColumnSettings()).toBeNull();
    });

    it('ネスト構造も JSON 経由で保存できる', () => {
        const settings = { width: 400, timeline: { hideRepost: null, hideReply: null }, langFilter: ['ja', 'en'] };
        savePublishColumnSettings(settings);
        expect(readPublishColumnSettings()).toEqual(settings);
    });
});

describe('preset storage', () => {
    it('presetForLegacyLayout のマッピング', () => {
        expect(presetForLegacyLayout('left')).toBe('tile');
        expect(presetForLegacyLayout('popup')).toBe('center');
        expect(presetForLegacyLayout('bottom')).toBe('bottom');
        expect(presetForLegacyLayout(null)).toBe('tile');
    });

    it('get/set/hasStoredPreset', () => {
        expect(hasStoredPreset()).toBe(false);
        expect(getPreferredPreset()).toBe('tile');
        setPreferredPreset('bottom');
        expect(hasStoredPreset()).toBe(true);
        expect(getPreferredPreset()).toBe('bottom');
        localStorage.setItem('publishColumnPreset', 'invalid');
        expect(getPreferredPreset()).toBe('tile');
    });
});
