import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import { makeColumn, columnKey, type CatalogItem } from '$lib/components/column/catalog/columnCatalog';
import type { Column } from '$lib/types/column';
import type { HomePlusFeed } from './feeds';
import { homePlusAlgorithm } from './lifecycle';
import { EMPTY_RECIPE, HOME_PLUS_PRESETS, cloneRecipe, recipeIcon, recipeKey, recipeSummary, type HomePlusRecipe } from './recipe';

type Translate = (key: string, values?: Record<string, unknown>) => string;

const SEARCH_WORD = 'HOME+';

function withIcon(column: Column, icon: string): Column {
    column.settings = { ...defaultDeckSettings, icon };
    return column;
}

function presetItem(did: string, handle: string, name: string, subtitle: string | undefined, icon: string, recipe: HomePlusRecipe, feed: HomePlusFeed | undefined, custom = false): CatalogItem {
    const column = withIcon(makeColumn(did, handle, {
        type: 'custom',
        algorithm: '',
        name,
        homePlus: { recipe: cloneRecipe(recipe), createdAt: '', customName: false },
    }), icon);
    return { key: columnKey(column), column, subtitle, icon, search: SEARCH_WORD, homePlus: { recipe, feed, custom }, removable: !!feed };
}

export function buildHomePlusItems(did: string, handle: string, feeds: HomePlusFeed[], t: Translate): CatalogItem[] {
    const presetKeys = new Set([EMPTY_RECIPE, ...HOME_PLUS_PRESETS.map((preset) => preset.recipe)].map(recipeKey));
    const separator = t('homeplus_sep');
    const byRecipe = new Map<string, HomePlusFeed>();
    for (const feed of feeds) {
        const key = feed.recipe ? recipeKey(feed.recipe) : '';
        if (key && !byRecipe.has(key)) byRecipe.set(key, feed);
    }

    const made = feeds
        .filter((feed) => !feed.recipe || !presetKeys.has(recipeKey(feed.recipe)))
        .map((feed): CatalogItem => {
            const icon = recipeIcon(feed.recipe);
            const column = withIcon(makeColumn(did, handle, homePlusAlgorithm(feed)), icon);
            return { key: `homeplus-feed:${feed.rkey}`, column, subtitle: t('homeplus_made'), icon, search: SEARCH_WORD, homePlus: { recipe: feed.recipe, feed }, removable: true };
        });

    const presets = HOME_PLUS_PRESETS.map((preset) => {
        const name = t(preset.nameKey);
        const summary = recipeSummary(preset.recipe, t).join(separator);
        return presetItem(did, handle, name, summary === name ? undefined : summary, preset.icon, preset.recipe, byRecipe.get(recipeKey(preset.recipe)));
    });

    return [
        ...made,
        ...presets,
        presetItem(did, handle, t('homeplus_custom'), t('homeplus_custom_sub'), 'home', EMPTY_RECIPE, byRecipe.get(recipeKey(EMPTY_RECIPE)), true),
    ];
}
