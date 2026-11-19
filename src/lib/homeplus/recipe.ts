import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedDefinitionRecord, CustomFeedPredicate } from '$lib/feedbuilder/types';
import {
    filterToPredicates,
    isNegated,
    isOrGroup,
    leafPred,
    makeLeaf,
    predicatesToFilter,
    type OrGroup,
    type PredicateOrGroup,
} from '$lib/feedbuilder/filterModel';
import { languageMap } from '$lib/langs/languageMap';

export type HomePlusCondId =
    | 'image'
    | 'illust'
    | 'photo'
    | 'video'
    | 'link'
    | 'noRepost'
    | 'noReply'
    | 'noQuote'
    | 'minLikes'
    | 'mutual'
    | 'noFlood'
    | 'noDuplicate'
    | 'noAdult'
    | 'language'
    | 'keyword';

export type HomePlusGroup = 'media' | 'kind' | 'reaction' | 'people' | 'content';

export interface HomePlusCond {
    id: HomePlusCondId;
    negated?: boolean;
    value?: number | string;
}

export type HomePlusSort = 'new' | 'likes' | 'hot';

export interface HomePlusRecipe {
    conds: HomePlusCond[];
    sort: HomePlusSort;
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

interface CondSpec {
    id: HomePlusCondId;
    group: HomePlusGroup;
    menuKey: string;
    labelKey: string;
    negKey?: string;
    repeatable?: boolean;
    make?: (cond: HomePlusCond) => CustomFeedPredicate;
    match?: (pred: CustomFeedPredicate) => HomePlusCond | null;
}

export const MIN_LIKES_CHOICES = [5, 10, 30, 100, 500];
export const FLOOD_CHOICES = [3, 10, 30, 100];
export const LANGUAGE_CHOICES = ['ja', 'en', 'ko', 'zh', 'es', 'pt', 'fr', 'de'];
export const SORT_CHOICES: HomePlusSort[] = ['new', 'likes', 'hot'];

const SORT_WINDOW = 'PT24H';
const FLOOD_MAX = 100;
const FLOOD_HOURS = 24;
const IMAGE_CONFIDENCE = 70;

function imageClassSpec(id: 'illust' | 'photo', cls: 'illustration' | 'photo'): CondSpec {
    return {
        id,
        group: 'media',
        menuKey: `homeplus_c_${id}`,
        labelKey: `homeplus_c_${id}`,
        make: () => ({ $type: D.predicateImageClass, class: cls }),
        match: (p) => p.$type === D.predicateImageClass && p.class === cls && (p.minConfidence ?? IMAGE_CONFIDENCE) === IMAGE_CONFIDENCE ? { id } : null,
    };
}

const SPECS: CondSpec[] = [
    {
        id: 'image',
        group: 'media',
        menuKey: 'homeplus_c_image',
        labelKey: 'homeplus_c_image',
        negKey: 'homeplus_c_image_neg',
        make: () => ({ $type: D.predicateHasImage, value: true }),
        match: (p) => p.$type === D.predicateHasImage && p.value === true ? { id: 'image' } : null,
    },
    imageClassSpec('illust', 'illustration'),
    imageClassSpec('photo', 'photo'),
    {
        id: 'video',
        group: 'media',
        menuKey: 'homeplus_c_video',
        labelKey: 'homeplus_c_video',
        negKey: 'homeplus_c_video_neg',
        make: () => ({ $type: D.predicateHasVideo, value: true }),
        match: (p) => p.$type === D.predicateHasVideo && p.value === true ? { id: 'video' } : null,
    },
    {
        id: 'link',
        group: 'media',
        menuKey: 'homeplus_c_link',
        labelKey: 'homeplus_c_link',
        negKey: 'homeplus_c_link_neg',
        make: () => ({ $type: D.predicateHasLink, value: true }),
        match: (p) => p.$type === D.predicateHasLink && p.value === true ? { id: 'link' } : null,
    },
    {
        id: 'noRepost',
        group: 'kind',
        menuKey: 'homeplus_m_no_repost',
        labelKey: 'homeplus_c_no_repost',
    },
    {
        id: 'noReply',
        group: 'kind',
        menuKey: 'homeplus_m_no_reply',
        labelKey: 'homeplus_c_no_reply',
        negKey: 'homeplus_c_no_reply_neg',
        make: () => ({ $type: D.predicateHasReply, value: false }),
        match: (p) => p.$type === D.predicateHasReply && p.value === false ? { id: 'noReply' } : null,
    },
    {
        id: 'noQuote',
        group: 'kind',
        menuKey: 'homeplus_m_no_quote',
        labelKey: 'homeplus_c_no_quote',
        negKey: 'homeplus_c_no_quote_neg',
        make: () => ({ $type: D.predicateHasQuote, value: false }),
        match: (p) => p.$type === D.predicateHasQuote && p.value === false ? { id: 'noQuote' } : null,
    },
    {
        id: 'minLikes',
        group: 'reaction',
        menuKey: 'homeplus_m_min_likes',
        labelKey: 'homeplus_c_min_likes',
        make: (c) => ({ $type: D.predicateMinLikes, threshold: Number(c.value) || 10 }),
        match: (p) => p.$type === D.predicateMinLikes ? { id: 'minLikes', value: p.threshold } : null,
    },
    {
        id: 'mutual',
        group: 'people',
        menuKey: 'homeplus_m_mutual',
        labelKey: 'homeplus_c_mutual',
        make: () => ({ $type: D.predicateIsMutual, value: true }),
        match: (p) => p.$type === D.predicateIsMutual && p.value === true ? { id: 'mutual' } : null,
    },
    {
        id: 'noFlood',
        group: 'people',
        menuKey: 'homeplus_m_no_flood',
        labelKey: 'homeplus_c_no_flood',
        make: (c) => ({ $type: D.predicateAuthorMaxPosts, max: Number(c.value) || FLOOD_MAX, withinHours: FLOOD_HOURS }),
        match: (p) => p.$type === D.predicateAuthorMaxPosts && p.withinHours === FLOOD_HOURS && !p.withinMinutes && (p.mode ?? 'recent') === 'recent' ? { id: 'noFlood', value: p.max } : null,
    },
    {
        id: 'noDuplicate',
        group: 'content',
        menuKey: 'homeplus_m_no_dup',
        labelKey: 'homeplus_c_no_dup',
        make: () => ({ $type: D.predicateIsDuplicate, value: false }),
        match: (p) => p.$type === D.predicateIsDuplicate && p.value === false ? { id: 'noDuplicate' } : null,
    },
    {
        id: 'noAdult',
        group: 'content',
        menuKey: 'homeplus_m_no_adult',
        labelKey: 'homeplus_c_no_adult',
        make: () => ({ $type: D.predicateHasLabel, value: false }),
        match: (p) => p.$type === D.predicateHasLabel && p.value === false && !p.labels ? { id: 'noAdult' } : null,
    },
    {
        id: 'language',
        group: 'content',
        menuKey: 'homeplus_m_language',
        labelKey: '',
        make: (c) => ({ $type: D.predicateLanguage, codes: [String(c.value || 'ja')] }),
        match: (p) => p.$type === D.predicateLanguage && p.codes.length === 1 ? { id: 'language', value: p.codes[0] } : null,
    },
    {
        id: 'keyword',
        group: 'content',
        menuKey: 'homeplus_m_keyword',
        labelKey: 'homeplus_c_keyword',
        negKey: 'homeplus_c_keyword_neg',
        repeatable: true,
        make: (c) => ({ $type: D.predicateKeyword, value: String(c.value ?? '') }),
        match: (p) => p.$type === D.predicateKeyword && !p.exact && (p.target ?? 'text') === 'text' && p.value.trim() ? { id: 'keyword', value: p.value } : null,
    },
];

const SPEC_BY_ID = new Map(SPECS.map((spec) => [spec.id, spec]));

export const HOME_PLUS_GROUPS: HomePlusGroup[] = ['media', 'kind', 'reaction', 'people', 'content'];

export interface HomePlusMenuItem {
    id: HomePlusCondId;
    group: HomePlusGroup;
    menuKey: string;
}

export function addableConds(recipe: HomePlusRecipe): HomePlusMenuItem[] {
    const used = new Set(recipe.conds.map((c) => c.id));
    return SPECS
        .filter((spec) => spec.repeatable || !used.has(spec.id))
        .filter((spec) => spec.id !== 'noRepost' || recipe.sort === 'new')
        .map(({ id, group, menuKey }) => ({ id, group, menuKey }));
}

export function isNegatable(id: HomePlusCondId): boolean {
    return !!SPEC_BY_ID.get(id)?.negKey;
}

export function valueChoices(id: HomePlusCondId): (number | string)[] | null {
    if (id === 'minLikes') return MIN_LIKES_CHOICES;
    if (id === 'noFlood') return FLOOD_CHOICES;
    if (id === 'language') return LANGUAGE_CHOICES;
    return null;
}

export function defaultCond(id: HomePlusCondId, language: string): HomePlusCond {
    if (id === 'minLikes') return { id, value: 10 };
    if (id === 'noFlood') return { id, value: FLOOD_MAX };
    if (id === 'language') return { id, value: LANGUAGE_CHOICES.includes(language) ? language : 'en' };
    return { id };
}

export function condLabel(cond: HomePlusCond, t: Translate): string {
    if (cond.id === 'language') {
        const name = languageMap.get(String(cond.value))?.name;
        return name ? t(name) : String(cond.value ?? '');
    }
    const spec = SPEC_BY_ID.get(cond.id);
    if (!spec) return '';
    const values = cond.id === 'minLikes' ? { n: cond.value } : cond.id === 'noFlood' ? { n: cond.value ?? FLOOD_MAX } : cond.id === 'keyword' ? { v: cond.value } : undefined;
    return t(cond.negated && spec.negKey ? spec.negKey : spec.labelKey, values);
}

export function sortLabel(sort: HomePlusSort, t: Translate): string {
    return t(`homeplus_sort_${sort}`);
}

export function recipeSummary(recipe: HomePlusRecipe, t: Translate): string[] {
    const parts = recipe.conds.map((c) => condLabel(c, t));
    if (recipe.sort !== 'new') parts.push(sortLabel(recipe.sort, t));
    return parts;
}

const NAME_MAX = 64;

export function limitHomePlusName(name: string): string {
    const chars = Array.from(name);
    return chars.length > NAME_MAX ? `${chars.slice(0, NAME_MAX - 1).join('')}…` : name;
}

export function recipeName(recipe: HomePlusRecipe, t: Translate): string {
    const key = recipeKey(recipe);
    const preset = HOME_PLUS_PRESETS.find((entry) => recipeKey(entry.recipe) === key);
    if (preset) return `HOME+ ${t(preset.nameKey)}`;

    const parts = recipeSummary(recipe, t);
    return limitHomePlusName(parts.length ? `HOME+ ${parts.join(t('homeplus_sep'))}` : 'HOME+');
}

export function recipeKey(recipe: HomePlusRecipe): string {
    const conds = recipe.conds
        .map((c) => `${c.id}:${c.negated ? '!' : ''}${c.value ?? ''}`)
        .sort();
    return `${recipe.sort}|${conds.join(',')}`;
}

export function cloneRecipe(recipe: HomePlusRecipe): HomePlusRecipe {
    return { sort: recipe.sort, conds: recipe.conds.map((c) => ({ ...c })) };
}

const REPLY_RULE: OrGroup = {
    kind: 'or',
    items: [
        { $type: D.predicateHasReply, value: false },
        { $type: D.predicateReplyToFollowing, value: true },
    ],
};

function isReplyRule(node: PredicateOrGroup): boolean {
    if (!isOrGroup(node) || node.items.length !== 2) return false;
    const [a, b] = node.items as CustomFeedPredicate[];
    return a?.$type === D.predicateHasReply && a.value === false && b?.$type === D.predicateReplyToFollowing && b.value === true;
}

export type HomePlusDefinition = Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'>;

export function recipeToDefinition(recipe: HomePlusRecipe, name: string): HomePlusDefinition {
    const leaves: PredicateOrGroup[] = [REPLY_RULE];
    let includeReposts = true;
    for (const cond of recipe.conds) {
        if (cond.id === 'noRepost') {
            includeReposts = false;
            continue;
        }
        const spec = SPEC_BY_ID.get(cond.id);
        if (spec?.make) leaves.push(makeLeaf(spec.make(cond), !!cond.negated && !!spec.negKey));
    }
    const sorted = recipe.sort !== 'new';
    return {
        name,
        source: { $type: D.sourceTimeline, scope: 'following', ...(includeReposts ? {} : { includeReposts: false }) },
        filter: predicatesToFilter(leaves),
        sort: recipe.sort === 'likes' ? 'likeCount' : recipe.sort === 'hot' ? 'hotness' : 'chronological',
        ...(sorted ? { sortWindow: SORT_WINDOW } : {}),
        visibility: 'private',
    };
}

function sortOf(record: CustomFeedDefinitionRecord): HomePlusSort | null {
    if (record.sort === 'chronological') return 'new';
    if (record.sortWindow !== SORT_WINDOW) return null;
    if (record.sort === 'likeCount') return 'likes';
    if (record.sort === 'hotness' && (!record.hotnessHalflife || record.hotnessHalflife === SORT_WINDOW)) return 'hot';
    return null;
}

export function definitionToRecipe(record: CustomFeedDefinitionRecord | undefined): HomePlusRecipe | null {
    if (!record || record.source?.$type !== D.sourceTimeline || record.source.scope !== 'following') return null;
    if (record.maxPerAuthor || record.hideSeen || record.pinnedPosts?.length || (record.contentMode && record.contentMode !== 'default')) return null;
    const sort = sortOf(record);
    const nodes = filterToPredicates(record.filter);
    if (!sort || !nodes) return null;

    const conds: HomePlusCond[] = [];
    if (record.source.includeReposts === false) conds.push({ id: 'noRepost' });
    for (const node of nodes) {
        if (isReplyRule(node)) continue;
        if (isOrGroup(node)) return null;
        const pred = leafPred(node);
        let cond: HomePlusCond | null = null;
        for (const spec of SPECS) {
            cond = spec.match?.(pred) ?? null;
            if (cond) break;
        }
        if (!cond) return null;
        if (isNegated(node)) {
            if (!isNegatable(cond.id)) return null;
            cond.negated = true;
        }
        conds.push(cond);
    }
    return { conds, sort };
}

export interface HomePlusPreset {
    id: string;
    nameKey: string;
    icon: string;
    recipe: HomePlusRecipe;
}

export const HOME_PLUS_PRESETS: HomePlusPreset[] = [
    { id: 'mutual', nameKey: 'homeplus_c_mutual', icon: 'usersround', recipe: { conds: [{ id: 'mutual' }], sort: 'new' } },
    { id: 'plain', nameKey: 'homeplus_p_plain', icon: 'pencil', recipe: { conds: [{ id: 'noReply' }, { id: 'noRepost' }], sort: 'new' } },
    { id: 'quiet', nameKey: 'homeplus_p_quiet', icon: 'coffee', recipe: { conds: [{ id: 'noFlood', value: 3 }], sort: 'new' } },
    { id: 'images', nameKey: 'homeplus_p_images', icon: 'image', recipe: { conds: [{ id: 'image' }], sort: 'new' } },
    { id: 'illust', nameKey: 'homeplus_c_illust', icon: 'palette', recipe: { conds: [{ id: 'illust' }], sort: 'new' } },
    { id: 'digest', nameKey: 'homeplus_p_digest', icon: 'clock', recipe: { conds: [], sort: 'likes' } },
];

export const EMPTY_RECIPE: HomePlusRecipe = { conds: [], sort: 'new' };

const ICON_BY_COND: Partial<Record<HomePlusCondId, string>> = {
    image: 'image',
    photo: 'image',
    illust: 'palette',
    video: 'movie',
    minLikes: 'heart',
    mutual: 'usersround',
    noFlood: 'coffee',
};

export function recipeIcon(recipe: HomePlusRecipe | null): string {
    if (recipe?.sort === 'likes' || recipe?.sort === 'hot') return 'clock';
    for (const cond of recipe?.conds ?? []) {
        const icon = ICON_BY_COND[cond.id];
        if (icon) return icon;
    }
    return 'home';
}
