import { describe, it, expect } from 'vitest';
import {
    migrateLegacyColumns,
    loadDeckState,
    reconcileDeckState,
    flattenLeafIds,
    slotIndexOfColumn,
    splitLeaf,
    splitLeafWithExisting,
    moveLeafToSplit,
    moveLeafToSlot,
    unsplitAt,
    swapAt,
    firstLeafId,
    DECK_SCHEMA_VERSION,
    type DeckLayoutState,
} from './deckLayout';

function col(id: string, extra: any = {}): any {
    return {
        id,
        algorithm: { type: 'default', name: id },
        style: 'default',
        did: 'did:plc:test',
        settings: {},
        data: { feed: [], cursor: '' },
        ...extra,
    };
}

function counterGen() {
    let n = 0;
    return () => `slot-${n++}`;
}

describe('migrateLegacyColumns', () => {
    it('単一カラムは単一leafスロットへ', () => {
        const state = migrateLegacyColumns([col('a'), col('b')], counterGen());
        expect(state.columns.map(c => c.id)).toEqual(['a', 'b']);
        expect(state.slots).toHaveLength(2);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
        expect(state.slots[1].layout).toEqual({ type: 'leaf', columnId: 'b' });
    });

    it('splitColumn は column方向の2分割スロットへ・両リーフがフラット化', () => {
        const legacy = [col('top', { splitColumn: col('bottom'), splitRatio: 0.6 })];
        const state = migrateLegacyColumns(legacy, counterGen());
        expect(state.columns.map(c => c.id).sort()).toEqual(['bottom', 'top']);
        expect((state.columns[0] as any).splitColumn).toBeUndefined();
        expect((state.columns[0] as any).splitRatio).toBeUndefined();
        const layout = state.slots[0].layout;
        expect(layout.type).toBe('split');
        if (layout.type === 'split') {
            expect(layout.direction).toBe('column');
            expect(layout.sizes).toEqual([0.6, 0.4]);
            expect(layout.children).toEqual([
                { type: 'leaf', columnId: 'top' },
                { type: 'leaf', columnId: 'bottom' },
            ]);
        }
    });

    it('splitRatio 未指定は 0.5/0.5', () => {
        const state = migrateLegacyColumns([col('t', { splitColumn: col('b') })], counterGen());
        const layout = state.slots[0].layout;
        if (layout.type === 'split') expect(layout.sizes).toEqual([0.5, 0.5]);
    });
});

describe('loadDeckState', () => {
    it('version2 オブジェクトはそのまま読込', () => {
        const v2 = {
            version: DECK_SCHEMA_VERSION,
            columns: [col('a')],
            slots: [{ id: 's0', layout: { type: 'leaf', columnId: 'a' } }],
        };
        const state = loadDeckState(v2, counterGen());
        expect(state.columns.map(c => c.id)).toEqual(['a']);
        expect(state.slots[0].id).toBe('s0');
    });

    it('旧形配列は移行される', () => {
        const state = loadDeckState([col('a', { splitColumn: col('b') })], counterGen());
        expect(state.columns.map(c => c.id).sort()).toEqual(['a', 'b']);
        expect(state.slots[0].layout.type).toBe('split');
    });

    it('空/未定義は空状態', () => {
        expect(loadDeckState(undefined, counterGen())).toEqual({ columns: [], slots: [] });
        expect(loadDeckState([], counterGen())).toEqual({ columns: [], slots: [] });
    });
});

describe('firstLeafId', () => {
    it('葉ノードはその columnId', () => {
        expect(firstLeafId({ type: 'leaf', columnId: 'x' })).toBe('x');
    });

    it('入れ子 split の最左リーフ（flattenLeafIds[0] と一致）', () => {
        const node = {
            type: 'split' as const,
            direction: 'row' as const,
            sizes: [0.5, 0.5],
            children: [
                { type: 'split' as const, direction: 'column' as const, sizes: [0.5, 0.5], children: [
                    { type: 'leaf' as const, columnId: 'a' },
                    { type: 'leaf' as const, columnId: 'b' },
                ] },
                { type: 'leaf' as const, columnId: 'c' },
            ],
        };
        expect(firstLeafId(node)).toBe('a');
        expect(firstLeafId(node)).toBe(flattenLeafIds(node)[0]);
    });
});

describe('flattenLeafIds / slotIndexOfColumn', () => {
    it('ツリー内の全リーフを行きがけ順で返す', () => {
        const node = {
            type: 'split' as const,
            direction: 'row' as const,
            sizes: [0.5, 0.5],
            children: [
                { type: 'leaf' as const, columnId: 'a' },
                { type: 'split' as const, direction: 'column' as const, sizes: [0.5, 0.5], children: [
                    { type: 'leaf' as const, columnId: 'b' },
                    { type: 'leaf' as const, columnId: 'c' },
                ] },
            ],
        };
        expect(flattenLeafIds(node)).toEqual(['a', 'b', 'c']);
    });

    it('columnId を含むスロット index を返す', () => {
        const state = migrateLegacyColumns([col('a'), col('x', { splitColumn: col('y') })], counterGen());
        expect(slotIndexOfColumn(state.slots, 'a')).toBe(0);
        expect(slotIndexOfColumn(state.slots, 'y')).toBe(1);
        expect(slotIndexOfColumn(state.slots, 'zzz')).toBe(-1);
    });
});

describe('splitLeaf', () => {
    it('リーフを2分割し newColumn を columns へ追加', () => {
        const base = migrateLegacyColumns([col('a')], counterGen());
        const state = splitLeaf(base, 'a', col('b'));
        expect(state.columns.map(c => c.id)).toEqual(['a', 'b']);
        const layout = state.slots[0].layout;
        expect(layout.type).toBe('split');
        if (layout.type === 'split') {
            expect(layout.direction).toBe('column');
            expect(flattenLeafIds(layout)).toEqual(['a', 'b']);
        }
    });

    it('特定ペインを再分割すると入れ子(binary tiling・任意方向)', () => {
        let state: DeckLayoutState = migrateLegacyColumns([col('a')], counterGen());
        state = splitLeaf(state, 'a', col('b'));
        state = splitLeaf(state, 'a', col('c'), 'row');
        const layout = state.slots[0].layout;
        expect(flattenLeafIds(layout)).toEqual(['a', 'c', 'b']);
        if (layout.type === 'split') {
            expect(layout.children).toHaveLength(2);
            const nested = layout.children[0];
            expect(nested.type).toBe('split');
            if (nested.type === 'split') expect(nested.direction).toBe('row');
        }
    });
});

describe('splitLeafWithExisting', () => {
    it('既存カラムで対象ペインを分割し source の元スロットを削除', () => {
        const base = migrateLegacyColumns([col('a'), col('b')], counterGen());
        const state = splitLeafWithExisting(base, 'a', 'b', 'row');
        expect(state.columns.map(c => c.id).sort()).toEqual(['a', 'b']);
        expect(state.slots).toHaveLength(1);
        const layout = state.slots[0].layout;
        expect(flattenLeafIds(layout)).toEqual(['a', 'b']);
        if (layout.type === 'split') expect(layout.direction).toBe('row');
    });
});

describe('moveLeafToSplit', () => {
    it('独立カラムを別ペインへ合流(column・source後ろ)し元スロットを削除', () => {
        const base = migrateLegacyColumns([col('a'), col('b')], counterGen());
        const state = moveLeafToSplit(base, 'b', 'a', 'column', false);
        expect(state.columns.map(c => c.id).sort()).toEqual(['a', 'b']);
        expect(state.slots).toHaveLength(1);
        const layout = state.slots[0].layout;
        expect(layout.type).toBe('split');
        if (layout.type === 'split') {
            expect(layout.direction).toBe('column');
            expect(flattenLeafIds(layout)).toEqual(['a', 'b']);
        }
    });

    it('sourceFirst=true は source が先(上/左)', () => {
        const base = migrateLegacyColumns([col('a'), col('b')], counterGen());
        const state = moveLeafToSplit(base, 'b', 'a', 'row', true);
        const layout = state.slots[0].layout;
        if (layout.type === 'split') {
            expect(layout.direction).toBe('row');
            expect(flattenLeafIds(layout)).toEqual(['b', 'a']);
        }
    });

    it('split 内のサブペインを別スロットへ移動(元 split は畳む)', () => {
        let state: DeckLayoutState = migrateLegacyColumns([col('top', { splitColumn: col('bottom') }), col('c')], counterGen());
        state = moveLeafToSplit(state, 'bottom', 'c', 'column', false);
        expect(state.slots).toHaveLength(2);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'top' });
        expect(flattenLeafIds(state.slots[1].layout)).toEqual(['c', 'bottom']);
    });

    it('source===target は不変', () => {
        const base = migrateLegacyColumns([col('a')], counterGen());
        expect(moveLeafToSplit(base, 'a', 'a')).toBe(base);
    });

    it('入れ子 split 内のリーフへも合流できる', () => {
        let state: DeckLayoutState = migrateLegacyColumns([col('a'), col('d')], counterGen());
        state = splitLeaf(state, 'a', col('b'));
        state = splitLeaf(state, 'a', col('c'), 'row');
        state = moveLeafToSplit(state, 'd', 'c', 'column', false);
        expect(state.slots).toHaveLength(1);
        expect(flattenLeafIds(state.slots[0].layout).sort()).toEqual(['a', 'b', 'c', 'd']);
        expect(slotIndexOfColumn(state.slots, 'd')).toBe(0);
    });
});

describe('moveLeafToSlot', () => {
    it('独立カラムを別 index へ移動(並べ替え)', () => {
        const base = migrateLegacyColumns([col('a'), col('b'), col('c')], counterGen());
        const state = moveLeafToSlot(base, 'a', 2, () => 'new');
        expect(state.slots.map(s => flattenLeafIds(s.layout)[0])).toEqual(['b', 'c', 'a']);
    });

    it('split のサブペインを独立スロットとして切り出し', () => {
        const base = migrateLegacyColumns([col('top', { splitColumn: col('bottom') })], counterGen());
        const state = moveLeafToSlot(base, 'bottom', 1, () => 'new');
        expect(state.slots).toHaveLength(2);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'top' });
        expect(state.slots[1]).toEqual({ id: 'new', layout: { type: 'leaf', columnId: 'bottom' } });
    });

    it('3分割からサブペイン抽出 → 元スロットは残り2リーフ', () => {
        let state: DeckLayoutState = migrateLegacyColumns([col('a')], counterGen());
        state = splitLeaf(state, 'a', col('b'));
        state = splitLeaf(state, 'b', col('c'));
        state = moveLeafToSlot(state, 'c', 1, () => 'new');
        expect(state.slots).toHaveLength(2);
        expect(flattenLeafIds(state.slots[0].layout).sort()).toEqual(['a', 'b']);
        expect(state.slots[1]).toEqual({ id: 'new', layout: { type: 'leaf', columnId: 'c' } });
    });
});

describe('unsplitAt', () => {
    it('keepAsSeparate=false は葉を除去し columns からも削除・スロットは葉へ畳む', () => {
        const base = migrateLegacyColumns([col('top', { splitColumn: col('bottom') })], counterGen());
        const state = unsplitAt(base, 0, 'bottom', false, counterGen());
        expect(state.columns.map(c => c.id)).toEqual(['top']);
        expect(state.slots).toHaveLength(1);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'top' });
    });

    it('keepAsSeparate=true は葉を新スロットへ切り出し columns は保持', () => {
        const base = migrateLegacyColumns([col('top', { splitColumn: col('bottom') })], counterGen());
        const state = unsplitAt(base, 0, 'bottom', true, () => 'newslot');
        expect(state.columns.map(c => c.id).sort()).toEqual(['bottom', 'top']);
        expect(state.slots).toHaveLength(2);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'top' });
        expect(state.slots[1]).toEqual({ id: 'newslot', layout: { type: 'leaf', columnId: 'bottom' } });
    });
});

describe('swapAt', () => {
    it('2分割の子順を反転', () => {
        const base = migrateLegacyColumns([col('top', { splitColumn: col('bottom'), splitRatio: 0.7 })], counterGen());
        const state = swapAt(base, 0);
        const layout = state.slots[0].layout;
        if (layout.type === 'split') {
            expect(flattenLeafIds(layout)).toEqual(['bottom', 'top']);
            expect(layout.sizes[0]).toBeCloseTo(0.3);
            expect(layout.sizes[1]).toBeCloseTo(0.7);
        }
    });

    it('単一leafスロットは不変', () => {
        const base = migrateLegacyColumns([col('a')], counterGen());
        const state = swapAt(base, 0);
        expect(state).toEqual(base);
    });
});

describe('reconcileDeckState / ブランチ環境(deckVersion>2)との互換', () => {
    it('version が進んだ永続データも loadDeckState が受理し整合修復する', () => {
        const state = loadDeckState({
            version: 4,
            columns: [col('a'), col('b')],
            slots: [
                { id: 's1', layout: { type: 'leaf', columnId: 'a' } },
                { id: 's2', layout: { type: 'leaf', columnId: 'b' } },
            ],
        }, counterGen());
        expect(state.columns.map(c => c.id)).toEqual(['a', 'b']);
        expect(state.slots.map(s => s.id)).toEqual(['s1', 's2']);
    });

    it('v2のtabsノード(childrenが文字列ID配列)はcolumn分割へ変換', () => {
        const state = reconcileDeckState(
            [col('a'), col('b'), col('c')],
            [
                { id: 's1', layout: { type: 'tabs', children: ['a', 'b'], active: 1 } },
                { id: 's2', layout: { type: 'leaf', columnId: 'c' } },
            ],
            counterGen(),
        );
        expect(state.slots).toHaveLength(2);
        const first = state.slots[0].layout;
        expect(first.type).toBe('split');
        expect(flattenLeafIds(first)).toEqual(['a', 'b']);
    });

    it('tabsノードで有効IDが1つだけならleafへ', () => {
        const state = reconcileDeckState(
            [col('a')],
            [{ id: 's1', layout: { type: 'tabs', children: ['a', 'ghost'], active: 0 } }],
            counterGen(),
        );
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
    });

    it('存在しないcolumnIdのleafは除去され、sizesは再正規化される', () => {
        const state = reconcileDeckState(
            [col('a'), col('b')],
            [{
                id: 's1',
                layout: {
                    type: 'split', direction: 'column', sizes: [0.25, 0.25, 0.5],
                    children: [
                        { type: 'leaf', columnId: 'a' },
                        { type: 'leaf', columnId: 'ghost' },
                        { type: 'leaf', columnId: 'b' },
                    ],
                },
            }],
            counterGen(),
        );
        const layout = state.slots[0].layout;
        expect(flattenLeafIds(layout)).toEqual(['a', 'b']);
        if (layout.type === 'split') {
            expect(layout.sizes[0]).toBeCloseTo(1 / 3);
            expect(layout.sizes[1]).toBeCloseTo(2 / 3);
        }
    });

    it('どのスロットにも属さないカラムは末尾にleafスロットとして補完される(不可視カラム救済)', () => {
        const state = reconcileDeckState(
            [col('a'), col('orphan')],
            [{ id: 's1', layout: { type: 'leaf', columnId: 'a' } }],
            counterGen(),
        );
        expect(state.slots).toHaveLength(2);
        expect(state.slots[1].layout).toEqual({ type: 'leaf', columnId: 'orphan' });
        expect(state.columns.map(c => c.id)).toEqual(['a', 'orphan']);
    });

    it('複数スロットに重複するleafは2度目以降を除去', () => {
        const state = reconcileDeckState(
            [col('a'), col('b')],
            [
                { id: 's1', layout: { type: 'split', direction: 'column', sizes: [0.5, 0.5], children: [{ type: 'leaf', columnId: 'a' }, { type: 'leaf', columnId: 'b' }] } },
                { id: 's2', layout: { type: 'leaf', columnId: 'a' } },
            ],
            counterGen(),
        );
        expect(state.slots).toHaveLength(1);
        expect(flattenLeafIds(state.slots[0].layout)).toEqual(['a', 'b']);
    });

    it('スロットID重複は2つ目を採番し直す(keyed each保護)', () => {
        const state = reconcileDeckState(
            [col('a'), col('b')],
            [
                { id: 'dup', layout: { type: 'leaf', columnId: 'a' } },
                { id: 'dup', layout: { type: 'leaf', columnId: 'b' } },
            ],
            counterGen(),
        );
        expect(state.slots.map(s => s.id)).toEqual(['dup', 'slot-0']);
    });

    it('カラム側のsplitColumn/splitRatio残骸はstripされる', () => {
        const state = reconcileDeckState(
            [col('a', { splitColumn: col('zombie'), splitRatio: 0.5 })],
            [{ id: 's1', layout: { type: 'leaf', columnId: 'a' } }],
            counterGen(),
        );
        expect((state.columns[0] as any).splitColumn).toBeUndefined();
        expect((state.columns[0] as any).splitRatio).toBeUndefined();
    });

    it('id重複カラム・id欠損カラムは先勝ちで除去', () => {
        const state = reconcileDeckState(
            [col('a'), col('a'), { algorithm: { type: 'default' } }, col('b')],
            [],
            counterGen(),
        );
        expect(state.columns.map(c => c.id)).toEqual(['a', 'b']);
        expect(state.slots).toHaveLength(2);
    });
});
