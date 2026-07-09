import { describe, it, expect } from 'vitest';
import {
    migrateLegacyColumns,
    loadDeckState,
    flattenLeafIds,
    slotIndexOfColumn,
    splitLeaf,
    splitLeafWithExisting,
    moveLeafToSplit,
    moveLeafToSlot,
    unsplitAt,
    swapAt,
    firstLeafId,
    findTabsNodeOf,
    tabifyLeaf,
    untabifyLeaf,
    normalizeTabsNodes,
    reorderedTab,
    DECK_SCHEMA_VERSION,
    type DeckLayoutState,
    type TabsNode,
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

describe('loadDeckState v3 マイグレーション', () => {
    const makePublish = () => col('pub', { algorithm: { type: 'publish', name: 'Post' } });
    const leftPinned = { legacyPublish: { layout: 'left' as const, pinned: true }, injectPublish: true, makePublishColumn: makePublish };

    function v2State() {
        const split = migrateLegacyColumns([col('a', { splitColumn: col('b'), splitRatio: 0.6 }), col('c')], counterGen());
        return { version: 2, columns: split.columns, slots: split.slots };
    }

    it('v3 データは素通し(columns/slots 不変)', () => {
        const persisted = { version: 3, columns: [col('a')], slots: [{ id: 's0', layout: { type: 'leaf', columnId: 'a' } }] };
        const state = loadDeckState(persisted, counterGen(), leftPinned);
        expect(state.columns).toEqual(persisted.columns);
        expect(state.slots).toEqual(persisted.slots);
    });

    it('v2 の split 含む slots ツリーが v3 でも完全保持される', () => {
        const persisted = v2State();
        const state = loadDeckState(persisted, counterGen(), {});
        expect(state.columns).toEqual(persisted.columns);
        expect(state.slots).toEqual(persisted.slots);
    });

    it('left+pinned は publish カラムを先頭スロットへ注入', () => {
        const persisted = v2State();
        const state = loadDeckState(persisted, counterGen(), leftPinned);
        expect(state.columns.map(c => c.id)).toContain('pub');
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'pub' });
        expect(state.slots).toHaveLength(persisted.slots.length + 1);
        expect(state.slots.slice(1)).toEqual(persisted.slots);
    });

    it('left+pinned=false / popup / bottom / null は注入しない', () => {
        for (const layout of ['left', 'popup', 'bottom', null] as const) {
            const pinned = layout !== 'left';
            const state = loadDeckState(v2State(), counterGen(), {
                legacyPublish: { layout, pinned },
                injectPublish: true,
                makePublishColumn: makePublish,
            });
            expect(state.columns.some(c => c.algorithm?.type === 'publish')).toBe(false);
        }
    });

    it('injectPublish=false では一切注入しない', () => {
        const state = loadDeckState(v2State(), counterGen(), { ...leftPinned, injectPublish: false });
        expect(state.columns.some(c => c.algorithm?.type === 'publish')).toBe(false);
    });

    it('既に publish カラムがある v2 データには注入しない(冪等)', () => {
        const persisted = v2State();
        persisted.columns.push(col('existing-pub', { algorithm: { type: 'publish', name: 'Post' } }));
        persisted.slots.push({ id: 'sp', layout: { type: 'leaf', columnId: 'existing-pub' } });
        const state = loadDeckState(persisted, counterGen(), leftPinned);
        expect(state.columns.filter(c => c.algorithm?.type === 'publish')).toHaveLength(1);
    });

    it('v3 に publish が2枚あるデータは1枚に正規化', () => {
        const persisted = {
            version: 3,
            columns: [col('p1', { algorithm: { type: 'publish', name: 'Post' } }), col('a'), col('p2', { algorithm: { type: 'publish', name: 'Post' } })],
            slots: [
                { id: 's0', layout: { type: 'leaf', columnId: 'p1' } },
                { id: 's1', layout: { type: 'leaf', columnId: 'a' } },
                { id: 's2', layout: { type: 'leaf', columnId: 'p2' } },
            ],
        };
        const state = loadDeckState(persisted, counterGen(), {});
        expect(state.columns.filter(c => c.algorithm?.type === 'publish').map(c => c.id)).toEqual(['p1']);
        expect(state.slots.map(s => s.id)).toEqual(['s0', 's1']);
    });

    it('legacy(v1 splitColumn)から v3 直行で変換+注入される', () => {
        const legacy = [col('top', { splitColumn: col('bottom'), splitRatio: 0.5 })];
        const state = loadDeckState(legacy, counterGen(), leftPinned);
        expect(state.columns.map(c => c.id).sort()).toEqual(['bottom', 'pub', 'top']);
        expect(state.slots[0].layout).toEqual({ type: 'leaf', columnId: 'pub' });
        expect(state.slots[1].layout.type).toBe('split');
    });

    it('makePublishColumn が throw しても入力 state のまま起動する', () => {
        const persisted = v2State();
        const state = loadDeckState(persisted, counterGen(), {
            ...leftPinned,
            makePublishColumn: () => { throw new Error('boom'); },
        });
        expect(state.columns).toEqual(persisted.columns);
        expect(state.slots).toEqual(persisted.slots);
    });

    it('columns が非配列/欠落でも例外なく起動できる state を返す', () => {
        expect(loadDeckState({ version: 2, columns: 'broken', slots: [] }, counterGen(), {}).slots).toEqual([]);
        expect(loadDeckState(undefined, counterGen(), {}).columns).toEqual([]);
        const rescued = loadDeckState({ version: 3, columns: [col('a')], slots: undefined }, counterGen(), {});
        expect(rescued.columns.map(c => c.id)).toEqual(['a']);
        expect(rescued.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
    });

    it('DECK_SCHEMA_VERSION は 4(tabs 追加・v3 以降は加算的受理)', () => {
        expect(DECK_SCHEMA_VERSION).toBe(4);
    });
});

describe('tabs node', () => {
    function tabsState(): DeckLayoutState {
        return {
            columns: [col('a'), col('b'), col('c')],
            slots: [
                { id: 's1', layout: { type: 'tabs', children: ['a', 'b'], active: 0 } },
                { id: 's2', layout: { type: 'leaf', columnId: 'c' } },
            ],
        };
    }

    it('flattenLeafIds は tabs の全 children を返す(監視/正規化の前提)', () => {
        const state = tabsState();
        expect(flattenLeafIds(state.slots[0].layout)).toEqual(['a', 'b']);
        expect(slotIndexOfColumn(state.slots, 'b')).toBe(0);
        expect(slotIndexOfColumn(state.slots, 'c')).toBe(1);
    });

    it('firstLeafId は active タブを返す(split 内の tabs も)', () => {
        expect(firstLeafId({ type: 'tabs', children: ['a', 'b'], active: 1 })).toBe('b');
        expect(firstLeafId({ type: 'tabs', children: ['a', 'b'], active: 99 })).toBe('b');
        expect(firstLeafId({
            type: 'split',
            direction: 'column',
            sizes: [0.5, 0.5],
            children: [{ type: 'tabs', children: ['x', 'y'], active: 1 }, { type: 'leaf', columnId: 'z' }],
        })).toBe('y');
    });

    it('tabifyLeaf: 2スロットが1つのタブグループになり新入りがアクティブ', () => {
        const state: DeckLayoutState = {
            columns: [col('a'), col('b')],
            slots: [
                { id: 's1', layout: { type: 'leaf', columnId: 'a' } },
                { id: 's2', layout: { type: 'leaf', columnId: 'b' } },
            ],
        };
        const next = tabifyLeaf(state, 'a', 'b');
        expect(next.slots).toHaveLength(1);
        expect(next.slots[0].layout).toEqual({ type: 'tabs', children: ['a', 'b'], active: 1 });
    });

    it('tabifyLeaf: 既存タブグループへは append + アクティブ化', () => {
        const next = tabifyLeaf(tabsState(), 'a', 'c');
        expect(next.slots).toHaveLength(1);
        expect(next.slots[0].layout).toEqual({ type: 'tabs', children: ['a', 'b', 'c'], active: 2 });
    });

    it('tabifyLeaf: split 内の leaf を source にすると detach され split が畳まれる', () => {
        const state: DeckLayoutState = {
            columns: [col('a'), col('b'), col('c')],
            slots: [
                {
                    id: 's1',
                    layout: {
                        type: 'split',
                        direction: 'column',
                        sizes: [0.5, 0.5],
                        children: [{ type: 'leaf', columnId: 'a' }, { type: 'leaf', columnId: 'b' }],
                    },
                },
                { id: 's2', layout: { type: 'leaf', columnId: 'c' } },
            ],
        };
        const next = tabifyLeaf(state, 'c', 'b');
        expect(next.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
        expect(next.slots[1].layout).toEqual({ type: 'tabs', children: ['c', 'b'], active: 1 });
    });

    it('untabifyLeaf: タブから外して直後に独立スロット挿入・2個グループは leaf に崩れる', () => {
        const next = untabifyLeaf(tabsState(), 'a', counterGen());
        expect(next.slots).toHaveLength(3);
        expect(next.slots[0].layout).toEqual({ type: 'leaf', columnId: 'b' });
        expect(next.slots[1].layout).toEqual({ type: 'leaf', columnId: 'a' });
        expect(next.slots[2].layout).toEqual({ type: 'leaf', columnId: 'c' });
    });

    it('unsplitAt(removeLeaf) は active を補正し1個で leaf に崩す', () => {
        const state: DeckLayoutState = {
            columns: [col('a'), col('b'), col('c')],
            slots: [{ id: 's1', layout: { type: 'tabs', children: ['a', 'b', 'c'], active: 2 } }],
        };
        const removedBefore = unsplitAt(state, 0, 'a', false, counterGen());
        expect(removedBefore.slots[0].layout).toEqual({ type: 'tabs', children: ['b', 'c'], active: 1 });

        const removedActive = unsplitAt(state, 0, 'c', false, counterGen());
        expect(removedActive.slots[0].layout).toEqual({ type: 'tabs', children: ['a', 'b'], active: 1 });
    });

    it('splitLeaf: タブメンバーを対象に split するとグループごと包む', () => {
        const state = tabsState();
        const next = splitLeaf(state, 'a', col('d'), 'column');
        const layout = next.slots[0].layout;
        expect(layout.type).toBe('split');
        if (layout.type === 'split') {
            expect(layout.children[0]).toEqual({ type: 'tabs', children: ['a', 'b'], active: 0 });
            expect(layout.children[1]).toEqual({ type: 'leaf', columnId: 'd' });
        }
    });

    it('moveLeafToSplit: タブグループへの4象限ドロップはグループごと split', () => {
        const next = moveLeafToSplit(tabsState(), 'c', 'b', 'row');
        expect(next.slots).toHaveLength(1);
        const layout = next.slots[0].layout;
        expect(layout.type).toBe('split');
        if (layout.type === 'split') {
            expect(layout.children[0]).toEqual({ type: 'tabs', children: ['a', 'b'], active: 0 });
            expect(layout.children[1]).toEqual({ type: 'leaf', columnId: 'c' });
        }
    });

    it('moveLeafToSlot: タブメンバーの抽出でグループが縮む', () => {
        const next = moveLeafToSlot(tabsState(), 'b', 2, counterGen());
        expect(next.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
        expect(next.slots[2].layout).toEqual({ type: 'leaf', columnId: 'b' });
    });

    it('findTabsNodeOf は所属グループを返す', () => {
        const state = tabsState();
        expect(findTabsNodeOf(state.slots[0].layout, 'b')?.children).toEqual(['a', 'b']);
        expect(findTabsNodeOf(state.slots[1].layout, 'c')).toBeNull();
    });

it('reorderedTab: 並び替えで active はカラム追随・範囲外/同一は null', () => {
        const node = { type: 'tabs', children: ['a', 'b', 'c'], active: 2 } as const;
        expect(reorderedTab(node, 0, 2)).toEqual({ children: ['b', 'c', 'a'], active: 1 });
        expect(reorderedTab(node, 2, 0)).toEqual({ children: ['c', 'a', 'b'], active: 0 });
        expect(reorderedTab(node, 1, 1)).toBeNull();
        expect(reorderedTab(node, 5, 0)).toBeNull();
    });

    it('normalizeTabsNodes: 欠損 id 除去・active clamp・1個崩し・0個スロット除去', () => {
        const state: DeckLayoutState = {
            columns: [col('a')],
            slots: [
                { id: 's1', layout: { type: 'tabs', children: ['a', 'ghost'], active: 5 } },
                { id: 's2', layout: { type: 'tabs', children: ['ghost1', 'ghost2'], active: 0 } },
            ],
        };
        const next = normalizeTabsNodes(state);
        expect(next.slots).toHaveLength(1);
        expect(next.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
    });

it('normalizeTabsNodes: タブメンバーの幅を先頭タブに揃える(グループ単一幅の自己修復)', () => {
        const state: DeckLayoutState = {
            columns: [
                col('a', { settings: { width: 'medium' } }),
                col('b', { settings: { width: 'xxl' } }),
                col('c', { settings: { width: 'small' } }),
            ],
            slots: [
                { id: 's1', layout: { type: 'tabs', children: ['a', 'b'], active: 0 } },
                { id: 's2', layout: { type: 'leaf', columnId: 'c' } },
            ],
        };
        const next = normalizeTabsNodes(state);
        expect(next.columns.find((c) => c.id === 'b')?.settings?.width).toBe('medium');
        expect(next.columns.find((c) => c.id === 'c')?.settings?.width).toBe('small');
        expect(next.columns.find((c) => c.id === 'a')?.settings?.width).toBe('medium');
    });

    it('kind/source メタは tabify 追加・タブ除去・normalize を通じて保持される', () => {
        const state: DeckLayoutState = {
            columns: [col('a'), col('b'), col('c')],
            slots: [
                { id: 's1', layout: { type: 'tabs', children: ['a', 'b'], active: 0, kind: 'feedtabs', source: 'pinned' } },
                { id: 's2', layout: { type: 'leaf', columnId: 'c' } },
            ],
        };
        const appended = tabifyLeaf(state, 'a', 'c');
        expect(appended.slots[0].layout).toEqual({ type: 'tabs', children: ['a', 'b', 'c'], active: 2, kind: 'feedtabs', source: 'pinned' });

        const removed = unsplitAt(state, 0, 'a', false, counterGen());
        expect(removed.slots[0].layout).toEqual({ type: 'tabs', children: ['b'], active: 0, kind: 'feedtabs', source: 'pinned' });

        const normalized = normalizeTabsNodes({
            columns: [col('a')],
            slots: [{ id: 's1', layout: { type: 'tabs', children: ['a', 'ghost'], active: 5, kind: 'feedtabs', source: 'pinned' } }],
        });
        expect(normalized.slots[0].layout).toEqual({ type: 'tabs', children: ['a'], active: 0, kind: 'feedtabs', source: 'pinned' });
    });

    it('source 付き tabs は children 1 でも leaf に崩れず、source 無しは従来どおり崩れる', () => {
        const pinned = normalizeTabsNodes({
            columns: [col('a')],
            slots: [{ id: 's1', layout: { type: 'tabs', children: ['a'], active: 0, source: 'pinned' } }],
        });
        expect(pinned.slots[0].layout.type).toBe('tabs');

        const plain = normalizeTabsNodes({
            columns: [col('a')],
            slots: [{ id: 's1', layout: { type: 'tabs', children: ['a'], active: 0, kind: 'feedtabs' } }],
        });
        expect(plain.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
    });

    it('loadDeckState: v4 の tabs を round-trip し v3 は従来どおり受理する', () => {
        const state = tabsState();
        const loaded = loadDeckState({ version: DECK_SCHEMA_VERSION, columns: state.columns, slots: state.slots }, counterGen());
        expect(loaded.slots[0].layout).toEqual({ type: 'tabs', children: ['a', 'b'], active: 0 });

        const v3 = loadDeckState({ version: 3, columns: [col('a')], slots: [{ id: 's', layout: { type: 'leaf', columnId: 'a' } }] }, counterGen());
        expect(v3.slots[0].layout).toEqual({ type: 'leaf', columnId: 'a' });
        expect(DECK_SCHEMA_VERSION).toBe(4);
    });

    it('normalizeContentColumns: タブ内の singleton 重複も除去できる', () => {
        const state: DeckLayoutState = {
            columns: [col('p1', { algorithm: { type: 'publish', name: 'p1' } }), col('p2', { algorithm: { type: 'publish', name: 'p2' } }), col('a')],
            slots: [
                { id: 's1', layout: { type: 'leaf', columnId: 'p1' } },
                { id: 's2', layout: { type: 'tabs', children: ['p2', 'a'], active: 0 } },
            ],
        };
        const loaded = loadDeckState({ version: 4, columns: state.columns, slots: state.slots }, counterGen());
        expect(loaded.columns.map((c) => c.id)).toEqual(['p1', 'a']);
        expect(loaded.slots[1].layout).toEqual({ type: 'leaf', columnId: 'a' });
    });
});
