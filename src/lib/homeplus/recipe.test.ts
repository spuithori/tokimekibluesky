import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedDefinitionRecord } from '$lib/feedbuilder/types';
import { HOME_PLUS_PRESETS, addableConds, definitionToRecipe, recipeKey, recipeName, recipeToDefinition, type HomePlusRecipe } from './recipe';

function record(recipe: HomePlusRecipe): CustomFeedDefinitionRecord {
    return { ...recipeToDefinition(recipe, 'x'), createdAt: '2026-11-18T00:00:00.000Z' };
}

const FULL: HomePlusRecipe = {
    sort: 'hot',
    conds: [
        { id: 'image', negated: true },
        { id: 'illust' },
        { id: 'photo' },
        { id: 'video' },
        { id: 'link', negated: true },
        { id: 'noRepost' },
        { id: 'noReply', negated: true },
        { id: 'noQuote' },
        { id: 'minLikes', value: 30 },
        { id: 'mutual' },
        { id: 'noFlood', value: 3 },
        { id: 'noDuplicate' },
        { id: 'noAdult' },
        { id: 'language', value: 'ja' },
        { id: 'keyword', value: '猫' },
        { id: 'keyword', value: '広告', negated: true },
    ],
};

describe('recipeToDefinition', () => {
    it('always reads the viewer\'s following timeline privately, with replies limited to followed accounts', () => {
        const def = recipeToDefinition({ conds: [], sort: 'new' }, 'HOME+');
        expect(def.source).toEqual({ $type: D.sourceTimeline, scope: 'following' });
        expect(def.visibility).toBe('private');
        expect(def.filter?.items).toEqual([
            {
                $type: D.filterGroup,
                op: 'or',
                items: [
                    { $type: D.predicateHasReply, value: false },
                    { $type: D.predicateReplyToFollowing, value: true },
                ],
            },
        ]);
    });

    it('survives a round trip through the definition for every condition', () => {
        for (const recipe of [FULL, ...HOME_PLUS_PRESETS.map((preset) => preset.recipe)]) {
            const parsed = definitionToRecipe(record(recipe));
            expect(parsed && recipeKey(parsed)).toBe(recipeKey(recipe));
        }
    });
});

describe('definitionToRecipe', () => {
    it('refuses definitions it cannot show as conditions, so editing never drops them', () => {
        const base = record({ conds: [{ id: 'image' }], sort: 'new' });
        const global = { ...base, source: { $type: D.sourceTimeline, scope: 'global' as const } };
        const regex = {
            ...base,
            filter: { $type: D.filterGroup, op: 'and' as const, items: [{ $type: D.predicateRegex, pattern: 'a' }] },
        };
        const orGroup = {
            ...base,
            filter: {
                $type: D.filterGroup,
                op: 'and' as const,
                items: [{ $type: D.filterGroup, op: 'or' as const, items: [{ $type: D.predicateHasImage, value: true }, { $type: D.predicateHasVideo, value: true }] }],
            },
        };
        expect(definitionToRecipe(global)).toBeNull();
        expect(definitionToRecipe(regex as CustomFeedDefinitionRecord)).toBeNull();
        expect(definitionToRecipe(orGroup as CustomFeedDefinitionRecord)).toBeNull();
        expect(definitionToRecipe({ ...base, hideSeen: true })).toBeNull();
        expect(definitionToRecipe({ ...base, sort: 'likeCount', sortWindow: 'P7D' })).toBeNull();
    });
});

describe('recipeKey', () => {
    it('treats the same conditions in a different order as the same feed', () => {
        const a: HomePlusRecipe = { sort: 'new', conds: [{ id: 'image' }, { id: 'minLikes', value: 10 }] };
        const b: HomePlusRecipe = { sort: 'new', conds: [{ id: 'minLikes', value: 10 }, { id: 'image' }] };
        expect(recipeKey(a)).toBe(recipeKey(b));
    });

    it('separates recipes that differ in a value, a negation or the order', () => {
        const base: HomePlusRecipe = { sort: 'new', conds: [{ id: 'image' }, { id: 'minLikes', value: 10 }] };
        const keys = new Set([
            recipeKey(base),
            recipeKey({ sort: 'new', conds: [{ id: 'image' }, { id: 'minLikes', value: 30 }] }),
            recipeKey({ sort: 'new', conds: [{ id: 'image', negated: true }, { id: 'minLikes', value: 10 }] }),
            recipeKey({ sort: 'likes', conds: base.conds }),
            recipeKey({ sort: 'new', conds: [{ id: 'image' }] }),
        ]);
        expect(keys.size).toBe(5);
    });
});

describe('recipeName', () => {
    const t = (key: string, values?: Record<string, unknown>) => `${key}${values ? Object.values(values).join('') : ''}`;

    it('never exceeds the 64 characters the feed server accepts', () => {
        const name = recipeName(FULL, t);
        expect(Array.from(name).length).toBe(64);
        expect(name.endsWith('…')).toBe(true);
    });

    it('uses the preset name while the conditions are still the preset', () => {
        const plain = HOME_PLUS_PRESETS.find((preset) => preset.id === 'plain')!;
        expect(recipeName(plain.recipe, t)).toBe('HOME+ homeplus_p_plain');
        expect(recipeName({ ...plain.recipe, conds: [...plain.recipe.conds, { id: 'image' }] }, t)).not.toContain('homeplus_p_plain');
    });
});

describe('addableConds', () => {
    it('offers "exclude reposts" only where reposts can appear', () => {
        const ids = (sort: HomePlusRecipe['sort']) => addableConds({ conds: [], sort }).map((item) => item.id);
        expect(ids('new')).toContain('noRepost');
        expect(ids('likes')).not.toContain('noRepost');
    });
});
