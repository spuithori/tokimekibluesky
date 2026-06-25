import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import { createDefaultSettings, CURRENT_VERSION } from './defaults';

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
        expect(result.version).toBe(5);
        expect(result.moderation.keywordMutes).toEqual([sampleMute]);
    });

    it('preserves existing moderation fields while folding keywordMutes', () => {
        const result = migrate(
            {
                version: 4,
                moderation: { contentLabels: { porn: 'hide' }, labelers: [{ did: 'did:x', labels: {} }] },
            },
            { keywordMutes: [{ ...sampleMute, word: 'bar' }] },
        );
        expect(result.moderation.contentLabels.porn).toBe('hide');
        expect(result.moderation.labelers).toEqual([{ did: 'did:x', labels: {} }]);
        expect(result.moderation.keywordMutes[0].word).toBe('bar');
    });

    it('initialises keywordMutes to [] when no legacy data exists (v4 -> v5)', () => {
        const result = migrate({ version: 4 });
        expect(result.version).toBe(5);
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
});
