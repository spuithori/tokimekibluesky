import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';

vi.stubGlobal(
    'Worker',
    class {
        postMessage() {}
        terminate() {}
        addEventListener() {}
        removeEventListener() {}
    },
);

vi.mock('./NotificationTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./ThreadTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./ChatTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./ChatListTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./ListTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./BookmarkTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./MochottTimeline.svelte', () => ({ default: () => {} }));
vi.mock('./Timeline.svelte', () => ({ default: () => {} }));
vi.mock('./PublishColumn.svelte', () => ({ default: () => {} }));
vi.mock('./SettingsColumn.svelte', () => ({ default: () => {} }));
vi.mock('$lib/components/column/ColumnAgentMissing.svelte', () => ({ default: () => {} }));

const column = { id: 'c1', algorithm: { type: 'plugin:broken:panel', name: 'Broken Plugin' } };

let loader: () => Promise<{ default: unknown }>;

vi.mock('$lib/classes/columnState.svelte', () => ({
    getScopedColumnState: () => ({ getColumn: () => column }),
}));

vi.mock('$lib/columnKinds', () => ({
    capabilityOf: () => ({ hasAgent: false, remountOnUnique: false }),
}));

vi.mock('$lib/columnKindRegistry.svelte', () => ({
    getColumnKind: () => ({ type: 'plugin:broken:panel', loader: () => loader() }),
}));

vi.mock('$lib/rice/riceState.svelte', () => ({
    riceState: { pluginConfig: () => ({ enable: true, options: {} }) },
}));

vi.mock('$lib/settings/settings.svelte', () => ({
    settingsStore: { rice: { config: '', enabled: true } },
}));

vi.mock('$lib/rice/config/edit', () => ({
    setValueInText: (text: string) => text,
}));

const { default: ColumnContent } = await import('./ColumnContent.svelte');

describe('ColumnContent のプラグイン隔離', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('loader が reject してもホストへ伝播せず、カラム内にエラーカードを描く', async () => {
        loader = () => Promise.reject(new Error('[integrity-mismatch] コードが改竄されています'));

        render(ColumnContent, { props: { index: 0, _agent: undefined } });

        expect(await screen.findByTestId('module-column-error')).toBeTruthy();
        expect(screen.getByText('Broken Plugin')).toBeTruthy();
        expect(screen.getByText(/integrity-mismatch/)).toBeTruthy();
    });

    it('プラグインが描画中に例外を投げてもホストへ伝播せず、エラーカードを描く', async () => {
        loader = () =>
            Promise.resolve({
                default: () => {
                    throw new Error('boom during render');
                },
            });

        render(ColumnContent, { props: { index: 0, _agent: undefined } });

        expect(await screen.findByTestId('module-column-error')).toBeTruthy();
    });

    it('壊れたプラグインの隣で、健全なプラグインカラムは描画され続ける', async () => {
        loader = () => Promise.reject(new Error('broken'));
        render(ColumnContent, { props: { index: 0, _agent: undefined } });
        expect(await screen.findByTestId('module-column-error')).toBeTruthy();

        loader = () =>
            Promise.resolve({
                default: (anchor: any) => {
                    const el = document.createElement('div');
                    el.setAttribute('data-testid', 'healthy-plugin');
                    anchor.before(el);
                },
            });
        render(ColumnContent, { props: { index: 1, _agent: undefined } });

        expect(await screen.findByTestId('healthy-plugin')).toBeTruthy();
    });
});
