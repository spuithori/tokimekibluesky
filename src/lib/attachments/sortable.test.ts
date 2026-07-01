import { describe, it, expect } from 'vitest';
import { dropZoneAt, insertionIndexAt, tileGesture, dockZoneAt } from './sortable.svelte';

describe('dropZoneAt', () => {
    const H = 800;

    it('上端帯(localY<band)は null(=並べ替え/独立化は別経路)', () => {
        expect(dropZoneAt(H, 0)).toBeNull();
        expect(dropZoneAt(H, 199)).toBeNull();
    });

    it('本体: band〜bodyMid は split top, bodyMid〜下端は split bottom', () => {
        expect(dropZoneAt(H, 200)).toEqual({ kind: 'split', zone: 'top' });
        expect(dropZoneAt(H, 499)).toEqual({ kind: 'split', zone: 'top' });
        expect(dropZoneAt(H, 500)).toEqual({ kind: 'split', zone: 'bottom' });
        expect(dropZoneAt(H, 799)).toEqual({ kind: 'split', zone: 'bottom' });
    });

    it('band は px 下限64でクランプ', () => {
        expect(dropZoneAt(120, 63)).toBeNull();
        expect(dropZoneAt(120, 64)).toEqual({ kind: 'split', zone: 'top' });
    });

    it('band は px 上限220でクランプ', () => {
        expect(dropZoneAt(2000, 219)).toBeNull();
        expect(dropZoneAt(2000, 220)).toEqual({ kind: 'split', zone: 'top' });
    });

    it('reorderBand で帯が変わる(クランプ範囲内)', () => {
        expect(dropZoneAt(600, 179, 0.3)).toBeNull();
        expect(dropZoneAt(600, 180, 0.3)).toEqual({ kind: 'split', zone: 'top' });
    });
});

describe('dropZoneAt ヒステリシス(デッドバンド)', () => {
    const H = 800;
    const D = 10;

    it('band 境界: split 中は band-deadband まで split を保持', () => {
        expect(dropZoneAt(H, 195, 0.25, null, D)).toBeNull();
        expect(dropZoneAt(H, 195, 0.25, { kind: 'split', zone: 'top' }, D)).toEqual({ kind: 'split', zone: 'top' });
        expect(dropZoneAt(H, 189, 0.25, { kind: 'split', zone: 'top' }, D)).toBeNull();
    });

    it('bodyMid 境界: top 中は mid+deadband まで top、bottom 中は mid-deadband まで bottom', () => {
        expect(dropZoneAt(H, 505, 0.25, { kind: 'split', zone: 'top' }, D)).toEqual({ kind: 'split', zone: 'top' });
        expect(dropZoneAt(H, 511, 0.25, { kind: 'split', zone: 'top' }, D)).toEqual({ kind: 'split', zone: 'bottom' });
        expect(dropZoneAt(H, 495, 0.25, { kind: 'split', zone: 'bottom' }, D)).toEqual({ kind: 'split', zone: 'bottom' });
        expect(dropZoneAt(H, 489, 0.25, { kind: 'split', zone: 'bottom' }, D)).toEqual({ kind: 'split', zone: 'top' });
    });

    it('deadband=0 は従来挙動(current 無視)', () => {
        expect(dropZoneAt(H, 195, 0.25, { kind: 'split', zone: 'top' }, 0)).toBeNull();
    });
});

describe('insertionIndexAt', () => {
    const cols = [
        { left: 0, right: 100 },
        { left: 100, right: 200 },
        { left: 200, right: 300 },
    ];

    it('左端より左 → 0', () => {
        expect(insertionIndexAt(cols, 10)).toBe(0);
        expect(insertionIndexAt(cols, 49)).toBe(0);
    });

    it('カラム中心を跨ぐごとに +1', () => {
        expect(insertionIndexAt(cols, 60)).toBe(1);
        expect(insertionIndexAt(cols, 160)).toBe(2);
        expect(insertionIndexAt(cols, 260)).toBe(3);
    });

    it('右端より右 → 末尾(n)', () => {
        expect(insertionIndexAt(cols, 999)).toBe(3);
    });

    it('空配列 → 0', () => {
        expect(insertionIndexAt([], 100)).toBe(0);
    });
});

describe('tileGesture (サブペイン統一判定)', () => {
    const W = 400;
    const H = 800;

    it('カラム左右端(±12px)は extract', () => {
        expect(tileGesture(W, H, 5, 400, false)).toEqual({ kind: 'extract', side: 'left' });
        expect(tileGesture(W, H, 12, 400, false)).toEqual({ kind: 'extract', side: 'left' });
        expect(tileGesture(W, H, 395, 400, false)).toEqual({ kind: 'extract', side: 'right' });
        expect(tileGesture(W, H, 388, 400, false)).toEqual({ kind: 'extract', side: 'right' });
    });

    it('自カラム中央 → null(その場でやめる)。ただし端は自カラムでも extract', () => {
        expect(tileGesture(W, H, 200, 400, true)).toBeNull();
        expect(tileGesture(W, H, 5, 400, true)).toEqual({ kind: 'extract', side: 'left' });
    });

    it('別カラム中央 → 上下分割(localY)', () => {
        expect(tileGesture(W, H, 200, 100, false)).toEqual({ kind: 'split', zone: 'top' });
        expect(tileGesture(W, H, 200, 399, false)).toEqual({ kind: 'split', zone: 'top' });
        expect(tileGesture(W, H, 200, 400, false)).toEqual({ kind: 'split', zone: 'bottom' });
        expect(tileGesture(W, H, 200, 700, false)).toEqual({ kind: 'split', zone: 'bottom' });
    });

    it('mid 付近は deadband でヒステリシス', () => {
        expect(tileGesture(W, H, 200, 405, false, { deadband: 10, current: 'top' })).toEqual({ kind: 'split', zone: 'top' });
        expect(tileGesture(W, H, 200, 411, false, { deadband: 10, current: 'top' })).toEqual({ kind: 'split', zone: 'bottom' });
        expect(tileGesture(W, H, 200, 395, false, { deadband: 10, current: 'bottom' })).toEqual({ kind: 'split', zone: 'bottom' });
        expect(tileGesture(W, H, 200, 389, false, { deadband: 10, current: 'bottom' })).toEqual({ kind: 'split', zone: 'top' });
    });
});

describe('dockZoneAt (フロート→タイル ドック判定)', () => {
    const box = (left: number, right: number) => ({ left, right, top: 0, bottom: 800 });
    const cols = [box(0, 100), box(100, 200), box(200, 300)];

    it('デッキ帯の上下外は null(自由フロート)', () => {
        expect(dockZoneAt(cols, 50, 900)).toBeNull();
        expect(dockZoneAt(cols, 50, -10)).toBeNull();
    });

    it('カラム本体(中央)は null(自由フロート)', () => {
        expect(dockZoneAt(cols, 50, 400)).toBeNull();
        expect(dockZoneAt(cols, 150, 400)).toBeNull();
    });

    it('カラム左端(±12)は前へ挿入', () => {
        expect(dockZoneAt(cols, 5, 400)).toEqual({ index: 0, lineX: 0 });
        expect(dockZoneAt(cols, 105, 400)).toEqual({ index: 1, lineX: 100 });
    });

    it('カラム右端(±12)は次へ挿入', () => {
        expect(dockZoneAt(cols, 90, 400)).toEqual({ index: 1, lineX: 100 });
        expect(dockZoneAt(cols, 295, 400)).toEqual({ index: 3, lineX: 300 });
    });

    it('デッキ左端より左の余白は null(自由フロート・サイドバー下等)', () => {
        expect(dockZoneAt(cols, -20, 400)).toBeNull();
    });

    it('デッキ右端より右の余白は null(自由フロート)', () => {
        expect(dockZoneAt(cols, 400, 400)).toBeNull();
    });

    it('カラム間の隙間(範囲内)は挿入する', () => {
        expect(dockZoneAt([{ left: 0, right: 90, top: 0, bottom: 800 }, { left: 110, right: 200, top: 0, bottom: 800 }], 100, 400)).toEqual({ index: 1, lineX: 100 });
    });

    it('空配列は null', () => {
        expect(dockZoneAt([], 50, 400)).toBeNull();
    });
});
