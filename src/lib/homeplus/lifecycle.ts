import { get } from 'svelte/store';
import { t } from 'tokimeki-i18n';
import type { Agent } from '$lib/agent';
import type { Column } from '$lib/types/column';
import { accountsDb } from '$lib/db';
import { agentsByDid } from '$lib/stores';
import { appState } from '$lib/classes/appState.svelte';
import {
    createHomePlusFeed,
    deleteHomePlusFeed,
    homePlusRkey,
    isHomePlusUri,
    listHomePlusFeeds,
    restoreHomePlusFeed,
    updateHomePlusFeed,
    type HomePlusFeed,
} from './feeds';
import { cloneRecipe, limitHomePlusName, recipeIcon, recipeKey, recipeName, type HomePlusRecipe } from './recipe';

type AlgorithmLike = Column['algorithm'];
type HomePlusCopy = NonNullable<AlgorithmLike['homePlus']>;

export function isHomePlusColumn(column: { algorithm?: AlgorithmLike } | undefined): boolean {
    return column?.algorithm?.type === 'custom' && !!column.algorithm.homePlus;
}

export function isHomePlusPending(column: { algorithm?: AlgorithmLike } | undefined): boolean {
    return isHomePlusColumn(column) && !column?.algorithm?.algorithm;
}

function description(): string {
    return t('homeplus_description');
}

function isCustomName(name: string | undefined, recipe: HomePlusRecipe | null): boolean {
    return !recipe || (!!name && name !== recipeName(recipe, t));
}

function hasCustomName(name: string | undefined, copy: HomePlusCopy, recipe: HomePlusRecipe | null = copy.recipe): boolean {
    return copy.customName ?? isCustomName(name, recipe);
}

export function isHomePlusAutoNamed(column: { algorithm?: AlgorithmLike } | undefined): boolean {
    const copy = column?.algorithm?.homePlus;
    return !!copy?.recipe && !hasCustomName(column?.algorithm?.name, copy);
}

export function homePlusAlgorithm(feed: HomePlusFeed): AlgorithmLike {
    return {
        type: 'custom',
        algorithm: feed.uri,
        name: feed.name,
        homePlus: {
            recipe: feed.recipe ? cloneRecipe(feed.recipe) : null,
            createdAt: feed.createdAt,
            customName: isCustomName(feed.name, feed.recipe),
        },
    };
}

function feedUris(column: { algorithm?: AlgorithmLike }): string[] {
    const uris = [column.algorithm?.algorithm, ...(column.algorithm?.sources ?? []).map((source) => source.algorithm)];
    return [...new Set(uris.filter((uri): uri is string => isHomePlusUri(uri)))];
}

export function countHomePlusFeedUses(columns: { algorithm?: AlgorithmLike }[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const column of columns) {
        for (const uri of feedUris(column)) counts.set(uri, (counts.get(uri) ?? 0) + 1);
    }
    return counts;
}

let otherProfiles: { current: unknown; uris: Promise<Set<string>> } | undefined;

function otherProfileUris(): Promise<Set<string>> {
    const current = appState.profile.current;
    if (otherProfiles?.current !== current) {
        const uris = accountsDb.profiles.toArray().then((profiles) => {
            const found = new Set<string>();
            for (const profile of profiles) {
                if (profile.id === current) continue;
                for (const column of profile.columns ?? []) {
                    for (const uri of feedUris(column)) found.add(uri);
                }
            }
            return found;
        });
        const entry = { current, uris };
        uris.catch(() => {
            if (otherProfiles === entry) otherProfiles = undefined;
        });
        otherProfiles = entry;
    }
    return otherProfiles.uris;
}

export function forgetHomePlusProfiles(): void {
    otherProfiles = undefined;
}

async function referencedElsewhere(uri: string, current: Column[], exceptId?: string): Promise<boolean> {
    if (current.some((column) => column.id !== exceptId && feedUris(column).includes(uri))) return true;
    return (await otherProfileUris()).has(uri);
}

function ownerAgent(uri: string): Agent | undefined {
    const did = uri.split('/')[2];
    return get(agentsByDid).get(did);
}

const feedLists = new WeakMap<Agent, HomePlusFeed[]>();
const feedLoads = new WeakMap<Agent, Promise<HomePlusFeed[]>>();
const staleLoads = new WeakSet<Agent>();

function fetchFeeds(agent: Agent): Promise<HomePlusFeed[]> {
    const task = listHomePlusFeeds(agent).then((feeds) => {
        feedLoads.delete(agent);
        if (staleLoads.delete(agent)) return fetchFeeds(agent);
        feedLists.set(agent, feeds);
        return feeds;
    }, (e) => {
        feedLoads.delete(agent);
        staleLoads.delete(agent);
        throw e;
    });
    feedLoads.set(agent, task);
    return task;
}

export function loadHomePlusFeeds(agent: Agent, fresh = false): Promise<HomePlusFeed[]> {
    const loading = feedLoads.get(agent);
    if (loading) return loading;
    const cached = fresh ? undefined : feedLists.get(agent);
    return cached ? Promise.resolve(cached) : fetchFeeds(agent);
}

function updateFeedList(agent: Agent, update: (feeds: HomePlusFeed[]) => HomePlusFeed[]): void {
    if (feedLoads.has(agent)) staleLoads.add(agent);
    const feeds = feedLists.get(agent);
    if (feeds) feedLists.set(agent, update(feeds));
}

async function createFeed(agent: Agent, recipe: HomePlusRecipe, name: string): Promise<HomePlusFeed> {
    const feed = await createHomePlusFeed(agent, cloneRecipe(recipe), name, description());
    updateFeedList(agent, (feeds) => [...feeds, feed]);
    return feed;
}

async function updateFeed(agent: Agent, uri: string, copy: HomePlusCopy, recipe: HomePlusRecipe, name: string, renamed: boolean): Promise<void> {
    const rkey = homePlusRkey(uri);
    await updateHomePlusFeed(agent, { rkey, name, description: description(), createdAt: copy.createdAt, recipe }, renamed);
    updateFeedList(agent, (feeds) => feeds.map((feed) => (feed.rkey === rkey ? { ...feed, name, recipe: cloneRecipe(recipe) } : feed)));
}

export async function removeHomePlusFeed(agent: Agent, rkey: string): Promise<void> {
    await deleteHomePlusFeed(agent, rkey);
    updateFeedList(agent, (feeds) => feeds.filter((feed) => feed.rkey !== rkey));
}

export async function removeUnusedHomePlusFeed(agent: Agent, feed: HomePlusFeed, columns: Column[]): Promise<boolean> {
    if (await referencedElsewhere(feed.uri, columns)) return false;
    await removeHomePlusFeed(agent, feed.rkey);
    return true;
}

const creating = new Map<string, Promise<HomePlusFeed>>();

export async function resolveHomePlusFeed(agent: Agent, recipe: HomePlusRecipe): Promise<HomePlusFeed> {
    const key = recipeKey(recipe);
    const feeds = await loadHomePlusFeeds(agent);
    const existing = feeds.find((feed) => feed.recipe && recipeKey(feed.recipe) === key);
    if (existing) return existing;

    const pendingKey = `${agent.did()}|${key}`;
    let task = creating.get(pendingKey);
    if (!task) {
        task = createFeed(agent, recipe, recipeName(recipe, t)).finally(() => creating.delete(pendingKey));
        creating.set(pendingKey, task);
    }
    return task;
}

const preparing = new Map<string, Promise<void>>();

export function prepareHomePlusColumn(agent: Agent, column: Column, columns: () => Column[]): Promise<void> {
    const recipe = column.algorithm?.homePlus?.recipe;
    if (!isHomePlusPending(column) || !recipe) return Promise.resolve();

    let task = preparing.get(column.id);
    if (!task) {
        task = (async () => {
            const feed = await resolveHomePlusFeed(agent, cloneRecipe(recipe));
            if (!isHomePlusPending(column) || !columns().some((entry) => entry.id === column.id)) {
                await releaseHomePlusUri(feed.uri, columns());
                return;
            }
            column.algorithm.algorithm = feed.uri;
            column.algorithm.name = feed.name;
            column.algorithm.homePlus = {
                recipe: column.algorithm.homePlus?.recipe ?? cloneRecipe(recipe),
                createdAt: feed.createdAt,
                customName: isCustomName(feed.name, feed.recipe),
            };
        })().finally(() => preparing.delete(column.id));
        preparing.set(column.id, task);
    }
    return task;
}

function isGone(column: Column, columns: () => Column[]): boolean {
    return !columns().some((entry) => entry.id === column.id);
}

export async function commitHomePlus(agent: Agent, column: Column, previous: HomePlusRecipe | null, next: HomePlusRecipe, columns: () => Column[]): Promise<void> {
    await prepareHomePlusColumn(agent, column, columns);

    const algorithm = column.algorithm;
    const copy = algorithm.homePlus;
    const uri = algorithm.algorithm as string;
    if (!copy || !uri) return;

    const customName = hasCustomName(algorithm.name, copy, previous);
    const name = customName ? (algorithm.name as string) : recipeName(next, t);

    if (await referencedElsewhere(uri, columns(), column.id)) {
        const feed = await createFeed(agent, next, name);
        if (isGone(column, columns)) {
            await releaseHomePlusUri(feed.uri, columns());
            return;
        }
        algorithm.algorithm = feed.uri;
        algorithm.name = name;
        algorithm.homePlus = { recipe: cloneRecipe(next), createdAt: feed.createdAt, customName };
        return;
    }

    await updateFeed(agent, uri, copy, next, name, name !== algorithm.name);
    if (isGone(column, columns)) {
        await releaseHomePlusUri(uri, columns());
        return;
    }
    algorithm.name = name;
    algorithm.homePlus = { recipe: cloneRecipe(next), createdAt: copy.createdAt, customName };
}

export async function renameHomePlus(agent: Agent, column: Column, input: string, columns: () => Column[]): Promise<void> {
    await prepareHomePlusColumn(agent, column, columns);

    const algorithm = column.algorithm;
    const copy = algorithm.homePlus;
    const uri = algorithm.algorithm;
    if (!copy?.recipe || !uri) return;

    const auto = recipeName(copy.recipe, t);
    const name = limitHomePlusName(input.trim()) || auto;
    const customName = name !== auto;
    if (name === algorithm.name) {
        algorithm.homePlus = { ...copy, customName };
        return;
    }

    if (await referencedElsewhere(uri, columns(), column.id)) {
        const feed = await createFeed(agent, copy.recipe, name);
        if (isGone(column, columns)) {
            await releaseHomePlusUri(feed.uri, columns());
            return;
        }
        algorithm.algorithm = feed.uri;
        algorithm.name = name;
        algorithm.homePlus = { recipe: copy.recipe, createdAt: feed.createdAt, customName };
        return;
    }

    await updateFeed(agent, uri, copy, copy.recipe, name, true);
    algorithm.name = name;
    algorithm.homePlus = { ...copy, customName };
}

export function followHomePlusIcon(column: Column, previous: HomePlusRecipe | null): void {
    const recipe = column.algorithm?.homePlus?.recipe ?? null;
    if (column.settings?.icon === recipeIcon(previous) && recipeIcon(recipe) !== column.settings.icon) {
        column.settings = { ...column.settings, icon: recipeIcon(recipe) };
    }
}

export async function releaseHomePlus(column: Column, remaining: Column[]): Promise<void> {
    for (const uri of feedUris(column)) {
        await releaseHomePlusUri(uri, remaining);
    }
}

export async function releaseHomePlusUri(uri: string | undefined, remaining: Column[]): Promise<void> {
    if (!uri || !isHomePlusUri(uri)) return;
    const agent = ownerAgent(uri);
    if (!agent) return;
    try {
        if (await referencedElsewhere(uri, remaining)) return;
        await removeHomePlusFeed(agent, homePlusRkey(uri));
    } catch (e) {
        console.error(e);
    }
}

const restoreTried = new Set<string>();

function mayBeMissing(error: unknown): boolean {
    const status = (error as { status?: unknown } | null)?.status;
    return typeof status === 'number' && status !== 429;
}

export async function restoreHomePlusColumn(agent: Agent | undefined, column: Column, error: unknown): Promise<boolean> {
    const copy = column.algorithm?.homePlus;
    const uri = column.algorithm?.algorithm;
    if (!agent || !isHomePlusColumn(column) || !copy?.recipe || !uri || restoreTried.has(column.id)) return false;
    if (!mayBeMissing(error) || uri.split('/')[2] !== agent.did()) return false;

    restoreTried.add(column.id);
    try {
        await restoreHomePlusFeed(agent, {
            rkey: homePlusRkey(uri),
            name: column.algorithm.name ?? recipeName(copy.recipe, t),
            description: description(),
            createdAt: copy.createdAt || new Date().toISOString(),
            recipe: copy.recipe,
        });
        return true;
    } catch (e) {
        restoreTried.delete(column.id);
        console.error(e);
        return false;
    }
}

export function markHomePlusLoaded(columnId: string): void {
    restoreTried.delete(columnId);
}

export function applyHomePlusFeeds(feeds: HomePlusFeed[], columns: Column[]): void {
    const byUri = new Map(feeds.map((feed) => [feed.uri, feed]));
    for (const column of columns) {
        const copy = column.algorithm?.homePlus;
        const feed = byUri.get(column.algorithm?.algorithm ?? '');
        if (!copy || !feed?.recipe || column.algorithm.type !== 'custom') continue;

        const changed = !copy.recipe || recipeKey(copy.recipe) !== recipeKey(feed.recipe);
        const renamed = column.algorithm.name !== feed.name;
        if (changed || renamed || copy.createdAt !== feed.createdAt) {
            column.algorithm.homePlus = {
                recipe: changed ? cloneRecipe(feed.recipe) : copy.recipe,
                createdAt: feed.createdAt,
                customName: renamed || changed ? isCustomName(feed.name, feed.recipe) : copy.customName,
            };
        }
        if (renamed) column.algorithm.name = feed.name;
    }
}

const synced = new Set<string>();

export function syncHomePlusColumns(agent: Agent | undefined, columns: () => Column[]): void {
    const did = agent?.did();
    if (!agent || !did || synced.has(did)) return;
    synced.add(did);

    const run = async () => {
        try {
            applyHomePlusFeeds(await loadHomePlusFeeds(agent, true), columns());
        } catch (e) {
            synced.delete(did);
            console.error(e);
        }
    };

    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => void run());
    } else {
        queueMicrotask(() => void run());
    }
}
