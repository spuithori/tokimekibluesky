import { describe, it, expect } from 'vitest';
import { quadrantZone, reorderBandPx, insertionIndexAt, dockZoneAt } from './sortable.svelte';

describe('reorderBandPx (並べ替え上部帯)', () => {
    it('高さの25%・下限64px・上限220px でクランプ', () => {
        expect(reorderBandPx(800)).toBe(200);
        expect(reorderBandPx(120)).toBe(64);
        expect(reorderBandPx(2000)).toBe(220);
    });
});

describe('quadrantZone (4方向 split 判定)', () => {
    const W = 400;
    const H = 400;

    it('各辺に近い位置 → その方向へ分割', () => {
        expect(quadrantZone(W, H, 200, 40)).toBe('top');
        expect(quadrantZone(W, H, 200, 360)).toBe('bottom');
        expect(quadrantZone(W, H, 40, 200)).toBe('left');
        expect(quadrantZone(W, H, 360, 200)).toBe('right');
    });

    it('縦長カラム: 左右端=横分割 / 上下端=縦分割', () => {
        expect(quadrantZone(400, 800, 20, 400)).toBe('left');
        expect(quadrantZone(400, 800, 380, 400)).toBe('right');
        expect(quadrantZone(400, 800, 200, 40)).toBe('top');
        expect(quadrantZone(400, 800, 200, 760)).toBe('bottom');
    });

    it('対角線上(tie)は横方向に倒す(adx>=ady)', () => {
        expect(quadrantZone(W, H, 100, 100)).toBe('left');
        expect(quadrantZone(W, H, 300, 100)).toBe('right');
    });

    it('軸ヒステリシス: 対角線近傍で current の軸を保持', () => {
        expect(quadrantZone(W, H, 140, 130)).toBe('top');
        expect(quadrantZone(W, H, 140, 130, 'left', 0.06)).toBe('left');
        expect(quadrantZone(W, H, 140, 130, 'top', 0.06)).toBe('top');
    });

    it('中央ゾーン: 中心近傍(|dx|,|dy| < 0.12)は center(タブ化)', () => {
        expect(quadrantZone(W, H, 200, 200)).toBe('center');
        expect(quadrantZone(W, H, 210, 200)).toBe('center');
        expect(quadrantZone(H, W, 200, 210)).toBe('center');
        expect(quadrantZone(W, H, 260, 200)).toBe('right');
        expect(quadrantZone(W, H, 200, 260)).toBe('bottom');
    });

    it('中央ゾーンのヒステリシス: current=center は抜けにくく、辺 current からは入りにくい', () => {
        expect(quadrantZone(W, H, 260, 200, 'center', 0.06)).toBe('center');
        expect(quadrantZone(W, H, 300, 200, 'center', 0.06)).toBe('right');
        expect(quadrantZone(W, H, 236, 200)).toBe('center');
        expect(quadrantZone(W, H, 236, 200, 'right', 0.06)).toBe('right');
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
