import { describe, expect, it } from 'vitest';
import type { BuiltinColumnType } from '$lib/types/column';
import {
    capabilityOf,
    columnKindCapabilities,
    hasSettingsPanel,
    isContentColumn,
    registerModuleCapability,
    type SettingsPanelId,
} from '$lib/columnKinds';

const ALL_TYPES = Object.keys(columnKindCapabilities) as BuiltinColumnType[];

function legacyIsContent(type: string): boolean {
    return type === 'publish' || type === 'settings';
}

const legacyPanelRules: Record<SettingsPanelId, (type: string) => boolean> = {
    search: (type) => type === 'search',
    style: (type) =>
        type !== 'notification' && type !== 'thread' && type !== 'chat' && type !== 'chatList' &&
        type !== 'mochottTimeline' && type !== 'networkFeed' && !legacyIsContent(type),
    refreshToTop: (type) =>
        type !== 'notification' && type !== 'thread' && type !== 'search' && type !== 'chat' && type !== 'chatList' &&
        type !== 'mochottTimeline' && type !== 'networkFeed' && !legacyIsContent(type),
    autoRefresh: (type) =>
        type !== 'chat' && type !== 'chatList' && type !== 'notification' && !legacyIsContent(type),
    autoRefreshRealtime: (type) => type === 'default' || type === 'officialList',
    realtimeFollows: (type) => type === 'default',
    playSound: (type) => !legacyIsContent(type),
    background: (type) => type === 'chat',
    autoScroll: (type) =>
        type !== 'notification' && type !== 'thread' && type !== 'search' && type !== 'chat' && type !== 'chatList' &&
        !legacyIsContent(type),
    notificationFilters: (type) => type === 'notification',
    timelineFilters: (type) =>
        type !== 'notification' && type !== 'thread' && type !== 'search' && type !== 'chat' && type !== 'chatList' &&
        type !== 'mochottTimeline' && type !== 'networkFeed' && !legacyIsContent(type),
    feedInfo: (type) => type === 'custom',
    listInfo: (type) => type === 'officialList',
    clearPosts: (type) => !legacyIsContent(type),
};

describe('columnKindCapabilities: DeckSettingsModal 真理値表互換', () => {
    it('全24種が定義されている', () => {
        expect(ALL_TYPES).toHaveLength(24);
    });

    for (const panel of Object.keys(legacyPanelRules) as SettingsPanelId[]) {
        it(`panel "${panel}" が現行の条件式と全種で一致する`, () => {
            for (const type of ALL_TYPES) {
                expect(hasSettingsPanel(type, panel), `${type} / ${panel}`).toBe(legacyPanelRules[panel](type));
            }
        });
    }
});

describe('columnKindCapabilities: DeckColumn/ColumnContent 分岐互換', () => {
    it('isContentColumn は publish/settings のみ true', () => {
        for (const type of ALL_TYPES) {
            expect(isContentColumn(type), type).toBe(legacyIsContent(type));
        }
        expect(isContentColumn(undefined)).toBe(false);
    });

    it('scrollToTopOnHeaderClick は chat/chatList のみ false', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).scrollToTopOnHeaderClick, type).toBe(type !== 'chat' && type !== 'chatList');
        }
    });

    it('refreshable は publish/settings のみ false', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).refreshable, type).toBe(!legacyIsContent(type));
        }
    });

    it('splittable は chat/chatList/publish/settings のみ false', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).splittable, type).toBe(
                type !== 'chat' && type !== 'chatList' && !legacyIsContent(type),
            );
        }
    });

    it('feedStorage: notification のみ notification、publish/settings のみ none', () => {
        for (const type of ALL_TYPES) {
            const expected = type === 'notification' ? 'notification' : legacyIsContent(type) ? 'none' : 'feed';
            expect(capabilityOf(type).feedStorage, type).toBe(expected);
        }
    });

    it('remountOnUnique は thread/list のみ true', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).remountOnUnique, type).toBe(type === 'thread' || type === 'list');
        }
    });

    it('singleton は publish のみ true', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).singleton, type).toBe(type === 'publish');
        }
    });

    it('hasAgent は publish/settings のみ false', () => {
        for (const type of ALL_TYPES) {
            expect(capabilityOf(type).hasAgent, type).toBe(!legacyIsContent(type));
        }
    });
});

describe('module capability の登録と解除', () => {
    it('未知の module:* は安全デフォルト(フィード無し・agent不要・非singleton)', () => {
        const cap = capabilityOf('module:unknown');
        expect(cap.feedStorage).toBe('none');
        expect(cap.hasAgent).toBe(false);
        expect(cap.refreshable).toBe(false);
        expect(cap.splittable).toBe(false);
        expect(cap.singleton).toBe(false);
        expect(cap.settingsPanels).toEqual([]);
    });

    it('registerModuleCapability で部分上書きでき、解除でデフォルトへ戻る', () => {
        const unregister = registerModuleCapability('module:test', { singleton: true, splittable: true });
        expect(capabilityOf('module:test').singleton).toBe(true);
        expect(capabilityOf('module:test').splittable).toBe(true);
        expect(capabilityOf('module:test').hasAgent).toBe(false);
        unregister();
        expect(capabilityOf('module:test').singleton).toBe(false);
    });

    it('ビルトイン型は module 登録で上書きされない', () => {
        const unregister = registerModuleCapability('module:x', {});
        expect(capabilityOf('default').feedStorage).toBe('feed');
        unregister();
    });
});
