import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import { createDefaultSettings, CURRENT_VERSION, DEFAULT_LABELER_SETTINGS } from './defaults';

describe('migrate', () => {
    it('returns fresh defaults for non-object input', () => {
        expect(migrate(undefined)).toEqual(createDefaultSettings());
        expect(migrate(null)).toEqual(createDefaultSettings());
        expect(migrate('garbage')).toEqual(createDefaultSettings());
        expect(migrate(42)).toEqual(createDefaultSettings());
    });

    it('brings a versionless payload up to the current version', () => {
        const result = migrate({});
        expect(result.version).toBe(CURRENT_VERSION);
        // v2 step sets skin only when design exists; v3 step backfills embed.klipy.
        expect(result.embed.klipy).toBe(true);
    });

    it('runs the v1 -> v2 step (skin reset) when design is present', () => {
        const result = migrate({ version: 1, design: { skin: 'legacy-skin', theme: 'defaut-1' } });
        expect(result.design.skin).toBe('default');
        expect(result.version).toBe(CURRENT_VERSION);
    });

    it('runs the v2 -> v3 step (klipy backfill) without clobbering other embeds', () => {
        const result = migrate({ version: 2, embed: { x: false, youtube: false } });
        expect(result.embed.klipy).toBe(true);
        expect(result.embed.x).toBe(false);
        expect(result.embed.youtube).toBe(false);
    });

    it('preserves an existing klipy=false through the v3 step', () => {
        const result = migrate({ version: 2, embed: { klipy: false } });
        expect(result.embed.klipy).toBe(false);
    });

    it('keeps a current (v3) payload intact and backfills missing keys', () => {
        const result = migrate({
            version: 3,
            general: { repostConfirmSkip: true },
        });
        expect(result.general.repostConfirmSkip).toBe(true);
        // Drift/missing keys are backfilled from defaults.
        expect(result.general.deleteConfirmSkip).toBe(false);
        expect(result.design.fontSize).toBe(2);
        expect(result.general.dataSaver).toBe(false);
    });

    it('converts a legacy named theme to its defaut-N id', () => {
        // oldIds index of 'royalblue' is 3 -> 'defaut-4'
        const result = migrate({ version: 3, design: { skin: 'default', theme: 'royalblue' } });
        expect(result.design.theme).toBe('defaut-4');
    });

    it('leaves an already-converted theme id unchanged', () => {
        const result = migrate({ version: 3, design: { skin: 'default', theme: 'defaut-10' } });
        expect(result.design.theme).toBe('defaut-10');
    });

    it('migrates the twilight skin to default + darkmode', () => {
        const result = migrate({ version: 3, design: { skin: 'twilight', theme: 'jade' } });
        expect(result.design.skin).toBe('default');
        expect(result.design.darkmode).toBe(true);
        // 'jade' is oldIds index 9 -> 'defaut-10'
        expect(result.design.theme).toBe('defaut-10');
    });

    it('preserves unknown keys non-destructively', () => {
        const result = migrate({
            version: 3,
            general: { futureFlag: 'keep-me' },
            brandNewCategory: { a: 1 },
        }) as any;
        expect(result.general.futureFlag).toBe('keep-me');
        expect(result.brandNewCategory).toEqual({ a: 1 });
    });

    it('deep-merges nested objects while taking arrays verbatim', () => {
        const result = migrate({
            version: 3,
            design: { reactionButtons: { shown: ['like'] } },
        });
        // array replaced wholesale, not element-merged
        expect(result.design.reactionButtons.shown).toEqual(['like']);
        // sibling nested defaults are backfilled
        expect(result.design.reactionButtons.reply.showCounts).toBe(true);
    });

    it('is idempotent on its own output', () => {
        const once = migrate({ version: 1, design: { skin: 'x', theme: 'lightpink' } });
        const twice = migrate(once);
        expect(twice).toEqual(once);
    });

    it('does not mutate the input object', () => {
        const input = { version: 3, design: { skin: 'twilight', theme: 'jade' } };
        const snapshot = structuredClone(input);
        migrate(input);
        expect(input).toEqual(snapshot);
    });

    it('folds legacy stateSettings into the unified tree (v3 -> v4)', () => {
        const result = migrate(
            { version: 3 },
            { stateSettings: { translationModel: 'llm', autoTranslate: true, markedUnread: true, disableEmbedVia: true } },
        );
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.general.translationModel).toBe('llm');
        expect(result.general.autoTranslate).toBe(true);
        expect(result.general.markedUnread).toBe(true);
        expect(result.embed.disableEmbedVia).toBe(true);
    });

    it('falls back to defaults for the four keys when stateSettings is absent', () => {
        const result = migrate({ version: 3 });
        expect(result.general.translationModel).toBe('nmt');
        expect(result.general.autoTranslate).toBe(false);
        expect(result.general.markedUnread).toBe(false);
        expect(result.embed.disableEmbedVia).toBe(false);
    });

    it('does not re-fold stateSettings once already at v4', () => {
        const result = migrate(
            { version: 4, general: { translationModel: 'nmt' } },
            { stateSettings: { translationModel: 'llm' } },
        );
        expect(result.general.translationModel).toBe('nmt');
    });

    const sampleMute = {
        enabled: true,
        word: 'foo',
        period: { start: '00:00', end: '23:59' },
        ignoreCaseSensitive: false,
        regExp: false,
    };

    it('folds legacy keywordMutes into moderation (v4 -> v5)', () => {
        const result = migrate({ version: 4 }, { keywordMutes: [sampleMute] });
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.moderation.keywordMutes).toEqual([sampleMute]);
    });

    it('preserves existing moderation fields while folding keywordMutes', () => {
        const result = migrate(
            {
                version: 4,
                moderation: { contentLabels: { porn: 'hide' } },
            },
            { keywordMutes: [{ ...sampleMute, word: 'bar' }] },
        );
        expect(result.moderation.contentLabels.porn).toBe('hide');
        expect(result.moderation.keywordMutes[0].word).toBe('bar');
    });

    it('initialises keywordMutes to [] when no legacy data exists (v4 -> v5)', () => {
        const result = migrate({ version: 4 });
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.moderation.keywordMutes).toEqual([]);
    });

    it('is idempotent on a v5 payload', () => {
        const once = migrate({ version: 4 }, { keywordMutes: [sampleMute] });
        const twice = migrate(once);
        expect(twice).toEqual(once);
    });

    it('does not re-fold keywordMutes once already at v5', () => {
        const kept = [{ ...sampleMute, word: 'kept' }];
        const result = migrate(
            { version: 5, moderation: { keywordMutes: kept } },
            { keywordMutes: [{ ...sampleMute, word: 'incoming' }] },
        );
        expect(result.moderation.keywordMutes).toEqual(kept);
    });

    const sampleLabeler = { did: 'did:plc:x', labels: { spam: 'hide', 'custom-label': 'warn' } };

    it('folds legacy labelerSettings into moderation (v5 -> v6)', () => {
        const result = migrate({ version: 5 }, { labelerSettings: [sampleLabeler] });
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.moderation.labelers).toEqual([sampleLabeler]);
    });

    it('backfills rice defaults when upgrading to v7 (v6 -> v7)', () => {
        const result = migrate({ version: 6 });
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.rice.enabled).toBe(true);
        expect(typeof result.rice.config).toBe('string');
        expect(result.rice.sources).toEqual({});
    });

    it('preserves an existing rice config through migration', () => {
        const result = migrate({ version: 6, rice: { enabled: false, config: 'theme {\n}', sources: { mine: '# x' } } });
        expect(result.rice.enabled).toBe(false);
        expect(result.rice.config).toBe('theme {\n}');
        expect(result.rice.sources).toEqual({ mine: '# x' });
    });

    it('backfills DEFAULT_LABELER_SETTINGS when no legacy labelerSettings (v5 -> v6)', () => {
        const result = migrate({ version: 5, moderation: { labelers: [] } });
        expect(result.moderation.labelers).toEqual(DEFAULT_LABELER_SETTINGS);
    });

    it('preserves sibling moderation fields through the v5 -> v6 fold', () => {
        const result = migrate(
            { version: 5, moderation: { contentLabels: { porn: 'hide' }, keywordMutes: [sampleMute] } },
            { labelerSettings: [sampleLabeler] },
        );
        expect(result.moderation.contentLabels.porn).toBe('hide');
        expect(result.moderation.keywordMutes).toEqual([sampleMute]);
        expect(result.moderation.labelers).toEqual([sampleLabeler]);
    });

    it('is idempotent on a v6 payload', () => {
        const once = migrate({ version: 5 }, { labelerSettings: [sampleLabeler] });
        const twice = migrate(once);
        expect(twice).toEqual(once);
    });

    it('does not re-fold labelerSettings once already at v6', () => {
        const kept = [{ ...sampleLabeler, did: 'did:plc:kept' }];
        const result = migrate(
            { version: 6, moderation: { labelers: kept } },
            { labelerSettings: [{ ...sampleLabeler, did: 'did:plc:incoming' }] },
        );
        expect(result.moderation.labelers).toEqual(kept);
    });

    it('normalizes folded labelerSettings (drops malformed entries and out-of-range values, keeps custom keys)', () => {
        const result = migrate({ version: 5 }, {
            labelerSettings: [
                { did: 'did:plc:ok', labels: { 'custom-x': 'warn', bad: 'nope', spam: 'hide' } },
                { did: 123, labels: {} },
                { labels: {} },
                'garbage',
            ],
        });
        expect(result.moderation.labelers).toEqual([
            { did: 'did:plc:ok', labels: { 'custom-x': 'warn', spam: 'hide' } },
        ]);
    });
});

describe('v8: mobileNewUi removal', () => {
    it('drops design.mobileNewUi from stored settings and bumps past v8', () => {
        const result = migrate({ version: 7, design: { mobileNewUi: true, darkmode: true } }, undefined);
        expect(result.version).toBe(CURRENT_VERSION);
        expect('mobileNewUi' in result.design).toBe(false);
        expect(result.design.darkmode).toBe(true);
    });

    it('is safe when design is absent', () => {
        const result = migrate({ version: 7 }, undefined);
        expect(result.version).toBe(CURRENT_VERSION);
    });
});

describe('v9: singleWidth string enum retirement', () => {
    it('converts each legacy preset string to its px value', () => {
        expect(migrate({ version: 8, design: { singleWidth: 'medium' } }, undefined).design.singleWidth).toBe(528);
        expect(migrate({ version: 8, design: { singleWidth: 'large' } }, undefined).design.singleWidth).toBe(600);
        expect(migrate({ version: 8, design: { singleWidth: 'xxs' } }, undefined).design.singleWidth).toBe(380);
        expect(migrate({ version: 8, design: { singleWidth: 'xxl' } }, undefined).design.singleWidth).toBe(760);
    });

    it('falls back to 528 for an unknown string', () => {
        const result = migrate({ version: 8, design: { singleWidth: 'huge' } }, undefined);
        expect(result.design.singleWidth).toBe(528);
    });

    it('passes a stored number through unchanged', () => {
        const result = migrate({ version: 8, design: { singleWidth: 700 } }, undefined);
        expect(result.design.singleWidth).toBe(700);
    });

    it('backfills the default when the stored value is garbage', () => {
        const result = migrate({ version: 8, design: { singleWidth: { broken: true } } }, undefined);
        expect(result.design.singleWidth).toBe(528);
    });

    it('is safe when design is absent and bumps to v9', () => {
        const result = migrate({ version: 8 }, undefined);
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.design.singleWidth).toBe(528);
    });

    it('converts a versionless legacy backup through the whole chain', () => {
        const result = migrate({ design: { singleWidth: 'xl' } }, undefined);
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.design.singleWidth).toBe(680);
    });

    it('is idempotent', () => {
        const once = migrate({ version: 8, design: { singleWidth: 'large' } }, undefined);
        const twice = migrate(JSON.parse(JSON.stringify(once)), undefined);
        expect(twice.design.singleWidth).toBe(600);
        expect(twice.version).toBe(CURRENT_VERSION);
    });
});

describe('v10: rice plugins backfill', () => {
    it('backfills rice.plugins when upgrading from v9', () => {
        const result = migrate({ version: 9, rice: { enabled: true, config: '# x', sources: {} } }, undefined);
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.rice.plugins).toEqual({});
    });

    it('carries installed plugin records through export -> migrate', () => {
        const exported = {
            version: CURRENT_VERSION,
            rice: {
                enabled: true,
                config: 'plugin:aurora {\n    enable = true\n}\n',
                sources: {},
                plugins: {
                    aurora: {
                        source: { kind: 'at', uri: 'at://did:plc:abc/tech.tokimeki.plugin.declaration/aurora', did: 'did:plc:abc', entryCid: 'bafkreiabc' },
                        name: 'Aurora Effect',
                        version: '1.0.0',
                        integrity: 'sha256-abc',
                        svelteVersion: '5.56.4',
                        installedAt: '2026-07-09T00:00:00.000Z',
                    },
                },
            },
        };
        const result = migrate(JSON.parse(JSON.stringify(exported)), undefined);
        expect(result.rice.plugins['aurora']?.source).toEqual({
            kind: 'at',
            uri: 'at://did:plc:abc/tech.tokimeki.plugin.declaration/aurora',
            did: 'did:plc:abc',
            entryCid: 'bafkreiabc',
        });
        expect(result.rice.plugins['aurora']?.integrity).toBe('sha256-abc');
        expect(result.rice.config).toContain('plugin:aurora');
    });

    it('v10 の url 形式のプラグイン記録を v11 の source へ変換する', () => {
        const stored = {
            version: 10,
            rice: {
                enabled: true,
                config: '',
                sources: {},
                plugins: {
                    aurora: {
                        url: 'https://example.com/aurora/manifest.json',
                        name: 'Aurora Effect',
                        version: '1.0.0',
                        integrity: 'sha256-abc',
                        svelteVersion: '5.56.4',
                        installedAt: '2026-07-09T00:00:00.000Z',
                    },
                },
            },
        };
        const result = migrate(JSON.parse(JSON.stringify(stored)), undefined);
        expect(result.version).toBe(CURRENT_VERSION);
        expect(result.rice.plugins['aurora']?.source).toEqual({ kind: 'url', manifestUrl: 'https://example.com/aurora/manifest.json' });
        expect((result.rice.plugins['aurora'] as any)?.url).toBeUndefined();
    });
});

describe('rice portability (backup round trip)', () => {
    it('carries rice.enabled/config/sources through export -> migrate', () => {
        const exported = {
            version: CURRENT_VERSION,
            rice: {
                enabled: false,
                config: 'source = preset:bluesky-shell\n\nlayout {\n    style = single\n}\n',
                sources: { 'store:abc': 'theme {\n}' },
            },
        };
        const result = migrate(JSON.parse(JSON.stringify(exported)), undefined);
        expect(result.rice.enabled).toBe(false);
        expect(result.rice.config).toContain('preset:bluesky-shell');
        expect(result.rice.config).toContain('style = single');
        expect(result.rice.sources).toEqual({ 'store:abc': 'theme {\n}' });
    });

    it('backfills rice defaults when a backup predates rice', () => {
        const result = migrate({ version: 5 }, undefined);
        expect(result.rice.enabled).toBe(true);
        expect(typeof result.rice.config).toBe('string');
        expect(result.rice.sources).toEqual({});
    });
});
