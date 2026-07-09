import { describe, expect, it } from 'vitest';
import { globalStyleForTokens, matchColumn, styleForColumn } from './columnRules';
import type { Column } from '$lib/types/column';

function makeColumn(overrides: Partial<{ type: string; name: string; did: string; handle: string }> = {}): Column {
    return {
        id: 'c1',
        algorithm: { type: (overrides.type ?? 'default') as any, name: overrides.name ?? 'Home' },
        style: 'default',
        did: overrides.did ?? 'did:plc:me',
        handle: overrides.handle,
        settings: {} as any,
        data: { cursor: '' },
    } as Column;
}

describe('matchColumn', () => {
    it('type 完全一致', () => {
        expect(matchColumn({ type: 'default' }, makeColumn())).toBe(true);
        expect(matchColumn({ type: 'notification' }, makeColumn())).toBe(false);
    });

    it('name 正規表現と完全一致', () => {
        expect(matchColumn({ name: 'Home' }, makeColumn())).toBe(true);
        expect(matchColumn({ name: '/^Ho/' }, makeColumn())).toBe(true);
        expect(matchColumn({ name: '/^X/' }, makeColumn())).toBe(false);
    });

    it('複数条件は AND', () => {
        expect(matchColumn({ type: 'default', did: 'did:plc:me' }, makeColumn())).toBe(true);
        expect(matchColumn({ type: 'default', did: 'did:plc:other' }, makeColumn())).toBe(false);
    });

it('空 match(match = all 由来)は全カラムにマッチする', () => {
        expect(matchColumn({}, makeColumn())).toBe(true);
        expect(matchColumn({}, makeColumn({ type: 'notification' }))).toBe(true);
    });

    it('壊れた正規表現はマッチしない(throw しない)', () => {
        expect(matchColumn({ name: '/[/' }, makeColumn())).toBe(false);
    });
});

describe('styleForColumn', () => {
    it('マッチしたルールの props を CSS 変数へ写像する', () => {
        const style = styleForColumn(
            [{ match: { type: 'default' }, props: { rounding: '16px', opacity: '0.9', blur: '8px' } }],
            makeColumn(),
        );
        expect(style).toContain('--deck-border-radius: 16px;');
        expect(style).toContain('--rice-column-opacity: 0.9;');
        expect(style).toContain('--deck-content-backdrop-filter: blur(8px);');
    });

    it('border は枠(4辺)のみに渡し、暗黙で divider を消す', () => {
        const style = styleForColumn(
            [{ match: { type: 'default' }, props: { border: '2px dashed #7a35f1' } }],
            makeColumn(),
        );
        expect(style).toContain('--deck-border: 2px dashed #7a35f1;');
        expect(style).toContain('--deck-border-color: #7a35f1;');
        expect(style).toContain('--deck-divider: none;');
        expect(style).not.toContain('--deck-border-right');
    });

    it('明示 divider は border の暗黙 none より優先される', () => {
        const style = styleForColumn(
            [{ match: { type: 'default' }, props: { border: '2px solid #7a35f1', divider: '1px solid #333' } }],
            makeColumn(),
        );
        expect(style).toContain('--deck-divider: 1px solid #333;');
        expect(style).not.toContain('--deck-divider: none;');
    });

    it('divider 単独指定も効く', () => {
        const style = styleForColumn(
            [{ match: { type: 'default' }, props: { divider: 'none' } }],
            makeColumn(),
        );
        expect(style).toBe('--deck-divider: none;');
    });

    it('後のルールが前のルールを上書きする(後勝ち)', () => {
        const style = styleForColumn(
            [
                { match: { type: 'default' }, props: { opacity: '0.5' } },
                { match: { name: 'Home' }, props: { opacity: '0.9' } },
            ],
            makeColumn(),
        );
        expect(style).toContain('--rice-column-opacity: 0.9;');
        expect(style).not.toContain('0.5');
    });

    it('マッチしないルールは無視され空文字を返す', () => {
        expect(styleForColumn([{ match: { type: 'notification' }, props: { opacity: '0.5' } }], makeColumn())).toBe('');
    });
});

describe('styleForColumn reactions', () => {
    it('left は Threads 風4変数を発行する(gap 既定 32px)', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { reactions: 'left' } }], makeColumn());
        expect(style).toContain('--timeline-reaction-justify: flex-start;');
        expect(style).toContain('--timeline-reaction-gap: 32px;');
        expect(style).toContain('--timeline-reaction-compact-display: flex;');
        expect(style).toContain('--timeline-reaction-item-width: auto;');
    });

    it('left の gap 指定が反映される', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { reactions: 'left 28px' } }], makeColumn());
        expect(style).toContain('--timeline-reaction-gap: 28px;');
    });

    it('spread は既定値4変数を明示発行する(グローバル token の per-column 戻し)', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { reactions: 'spread' } }], makeColumn());
        expect(style).toContain('--timeline-reaction-justify: space-between;');
        expect(style).toContain('--timeline-reaction-gap: 0px;');
        expect(style).toContain('--timeline-reaction-compact-display: grid;');
        expect(style).toContain('--timeline-reaction-item-width: 24px;');
    });

    it('複数ルールは後勝ちで合成される', () => {
        const style = styleForColumn(
            [
                { match: { type: 'default' }, props: { reactions: 'left' } },
                { match: { type: 'default' }, props: { reactions: 'spread' } },
            ],
            makeColumn(),
        );
        expect(style).toContain('--timeline-reaction-justify: space-between;');
    });
});

describe('styleForColumn heading / titlebar', () => {
    it('heading = hover は空間0+透明+hover復帰変数を発行する', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { heading: 'hover' } }], makeColumn());
        expect(style).toContain('--rice-heading-mb: calc(0px - var(--deck-heading-height));');
        expect(style).toContain('--rice-heading-opacity: 0;');
        expect(style).toContain('--rice-heading-pe: none;');
        expect(style).toContain('--deck-heading-space: 0px;');
        expect(style).toContain('--rice-heading-hover-opacity: 1;');
        expect(style).toContain('--rice-heading-hover-pe: auto;');
        expect(style).toContain('--rice-heading-hotzone-pe: auto;');
        expect(style).toContain('--rice-heading-hint: 0.45;');
    });

    it('heading = hidden は hover 復帰変数を発行しない', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { heading: 'hidden' } }], makeColumn());
        expect(style).toContain('--rice-heading-opacity: 0;');
        expect(style).not.toContain('--rice-heading-hover-opacity');
        expect(style).not.toContain('--rice-heading-hotzone-pe');
        expect(style).not.toContain('--rice-heading-hint');
    });

    it('heading = show は既定値を明示発行する', () => {
        const style = styleForColumn([{ match: { type: 'default' }, props: { heading: 'show' } }], makeColumn());
        expect(style).toContain('--rice-heading-opacity: 1;');
        expect(style).toContain('--deck-heading-space: var(--deck-heading-height);');
    });

    it('titlebar = hover は透明+padding回収、show は復元を発行する', () => {
        const hover = styleForColumn([{ match: { type: 'default' }, props: { titlebar: 'hover' } }], makeColumn());
        expect(hover).toContain('--rice-popup-titlebar-opacity: 0;');
        expect(hover).toContain('--rice-popup-pt: 0px;');

        const show = styleForColumn([{ match: { type: 'default' }, props: { titlebar: 'show' } }], makeColumn());
        expect(show).toContain('--rice-popup-titlebar-opacity: 1;');
        expect(show).toContain('--rice-popup-pt: var(--deck-popup-titlebar-height, 30px);');
    });
});

describe('styleForColumn windowrule v2 拡張', () => {
    it('width はプリセット名を幅変数へ写像し px はそのまま発行する', () => {
        const preset = styleForColumn([{ match: { type: 'default' }, props: { width: 'small' } }], makeColumn());
        expect(preset).toContain('--rice-column-width: var(--deck-s-width);');

        const px = styleForColumn([{ match: { type: 'default' }, props: { width: '420px' } }], makeColumn());
        expect(px).toContain('--rice-column-width: 420px;');
    });

    it('width はタイル重み --rice-tile-weight も発行しクランプする', () => {
        const preset = styleForColumn([{ match: { type: 'default' }, props: { width: 'small' } }], makeColumn());
        expect(preset).toContain('--rice-tile-weight: 350;');

        const px = styleForColumn([{ match: { type: 'default' }, props: { width: '420px' } }], makeColumn());
        expect(px).toContain('--rice-tile-weight: 420;');

        const over = styleForColumn([{ match: { type: 'default' }, props: { width: '2000px' } }], makeColumn());
        expect(over).toContain('--rice-column-width: 2000px;');
        expect(over).toContain('--rice-tile-weight: 1200;');
    });

    it('background / dim / padding / heading-bg を対応変数へ発行する', () => {
        const style = styleForColumn(
            [{ match: { type: 'default' }, props: { background: '#101010', dim: '0.6', padding: '12px', 'heading-bg': '#202020' } }],
            makeColumn(),
        );
        expect(style).toContain('--deck-content-bg-color: #101010;');
        expect(style).toContain('--rice-column-dim: 0.6;');
        expect(style).toContain('--timeline-padding: 12px;');
        expect(style).toContain('--deck-heading-bg-color: #202020;');
    });

    it('editorheight は px で固定・fill でフレックス伸長の変数ペアを発行する', () => {
        const px = styleForColumn([{ match: { type: 'publish' }, props: { editorheight: '320px' } }], makeColumn({ type: 'publish' }));
        expect(px).toContain('--publish-editor-height: 320px;');
        expect(px).toContain('--publish-editor-flex: 0 0 auto;');

        const fill = styleForColumn([{ match: { type: 'publish' }, props: { editorheight: 'fill' } }], makeColumn({ type: 'publish' }));
        expect(fill).toContain('--publish-editor-height: 100%;');
        expect(fill).toContain('--publish-editor-flex: 1;');
        expect(fill).toContain('--publish-form-flex: 1 1 auto;');
        expect(fill).toContain('--publish-drafts-display: none;');

        const auto = styleForColumn([{ match: { type: 'publish' }, props: { editorheight: 'auto' } }], makeColumn({ type: 'publish' }));
        expect(auto).toContain('--publish-editor-height: auto;');
        expect(auto).toContain('--publish-editor-flex: 0 0 auto;');
        expect(auto).toContain('--publish-form-flex: 0 1 auto;');
        expect(auto).toContain('--publish-drafts-display: block;');
    });
});

describe('globalStyleForTokens', () => {
    it('トークンを -- 付き CSS 変数宣言列にする', () => {
        expect(globalStyleForTokens({ 'deck-border-radius': '20px', 'decks-gap': '12px' })).toBe(
            '--deck-border-radius: 20px;--decks-gap: 12px;',
        );
    });
});
