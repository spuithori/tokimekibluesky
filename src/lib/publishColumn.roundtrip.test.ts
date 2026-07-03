import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            get: () => Promise.resolve(null),
            update: () => Promise.resolve(),
        },
    },
}));
vi.mock('$lib/classes/appState.svelte', () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: { markedUnread: false, design: { layout: 'decks' } } },
}));
vi.mock('$lib/stores', () => ({
    agent: { subscribe: (run: any) => { run(undefined); return () => {}; } },
}));
vi.mock('$lib/animations/flip', () => ({
    animateLayout: (fn: any) => fn(),
}));
vi.mock('$lib/classes/publishState.svelte', () => ({
    publishState: { focusTick: 0, pinned: false, show: false, intercept: undefined },
}));

import { createRealColumnState } from '$lib/classes/columnState.perf.harness.svelte';
import { ensurePublishColumn, removePublishColumn, findPublishColumn } from '$lib/publishColumn';

beforeEach(() => {
    localStorage.clear();
});

describe('publish カラム: 閉じる→再度開く ラウンドトリップ', () => {
    it('タイルで開いて閉じ、再度開くとタイルで復元', () => {
        const { cs, cleanup } = createRealColumnState();

        ensurePublishColumn(cs);
        let pub = findPublishColumn(cs.columns);
        expect(pub).toBeDefined();
        expect(pub.settings.isPopup).toBeFalsy();
        expect(cs.slots.some((s: any) => s.layout.type === 'leaf' && s.layout.columnId === pub.id)).toBe(true);

        removePublishColumn(cs);
        expect(findPublishColumn(cs.columns)).toBeUndefined();

        ensurePublishColumn(cs);
        pub = findPublishColumn(cs.columns);
        expect(pub).toBeDefined();
        expect(pub.settings.isPopup).toBeFalsy();

        cleanup();
    });

    it('ポップアップ化して閉じ(タイトルバー×=removePublishColumn)、再度開くとポップアップで復元', () => {
        const { cs, cleanup } = createRealColumnState();

        ensurePublishColumn(cs);
        const pub = findPublishColumn(cs.columns);
        pub.settings = { ...pub.settings, isPopup: true, popupPreset: 'center', popupPosition: { x: 40, y: 24, width: 600, height: 560 } };

        removePublishColumn(cs);
        expect(findPublishColumn(cs.columns)).toBeUndefined();

        ensurePublishColumn(cs);
        const reopened = findPublishColumn(cs.columns);
        expect(reopened).toBeDefined();
        expect(reopened.settings.isPopup).toBe(true);
        expect(reopened.settings.popupPreset).toBe('center');
        expect(reopened.settings.popupPosition).toEqual({ x: 40, y: 24, width: 600, height: 560 });

        cleanup();
    });

    it('ポップアップで復元後にタイルへ戻して閉じると、次回はタイルで開く', () => {
        const { cs, cleanup } = createRealColumnState();

        ensurePublishColumn(cs);
        let pub = findPublishColumn(cs.columns);
        pub.settings = { ...pub.settings, isPopup: true };
        removePublishColumn(cs);

        ensurePublishColumn(cs);
        pub = findPublishColumn(cs.columns);
        expect(pub.settings.isPopup).toBe(true);

        pub.settings = { ...pub.settings, isPopup: false };
        removePublishColumn(cs);

        ensurePublishColumn(cs);
        pub = findPublishColumn(cs.columns);
        expect(pub.settings.isPopup).toBeFalsy();

        cleanup();
    });

    it('同時に2枚は作られない(シングルトン)', () => {
        const { cs, cleanup } = createRealColumnState();
        ensurePublishColumn(cs);
        ensurePublishColumn(cs);
        expect(cs.columns.filter((c: any) => c.algorithm?.type === 'publish')).toHaveLength(1);
        cleanup();
    });
});
