import type { Agent } from '$lib/agent';
import type { CustomFeedDefinitionRecord } from '$lib/feedbuilder/types';
import { definitionToRecipe, recipeToDefinition, type HomePlusRecipe } from './recipe';

export const HOME_PLUS_PREFIX = 'homeplus-';

const DEFINITION = 'tech.tokimeki.feeds.definition';
const GENERATOR = 'app.bsky.feed.generator';
const PROXY = { proxyDid: 'did:web:feeds.tokimeki.blue', proxyServiceId: 'bsky_fg' };

export interface HomePlusFeed {
    rkey: string;
    uri: string;
    name: string;
    createdAt: string;
    recipe: HomePlusRecipe | null;
}

export interface HomePlusFeedInput {
    rkey: string;
    name: string;
    description: string;
    createdAt: string;
    recipe: HomePlusRecipe;
}

export function homePlusUri(did: string, rkey: string): string {
    return `at://${did}/${GENERATOR}/${rkey}`;
}

export function homePlusRkey(uri: string | undefined): string {
    const match = uri?.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.generator\/(homeplus-[^/]+)$/);
    return match ? match[1] : '';
}

const URI_MARK = `/${GENERATOR}/${HOME_PLUS_PREFIX}`;

export function isHomePlusUri(uri: string | undefined): boolean {
    return !!uri && uri.includes(URI_MARK);
}

function newRkey(): string {
    const random = Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0');
    return `${HOME_PLUS_PREFIX}${Date.now().toString(36)}${random}`;
}

function definitionUri(did: string, rkey: string): string {
    return `at://${did}/${DEFINITION}/${rkey}`;
}

function did(agent: Agent): string {
    return agent.did() as string;
}

function refresh(agent: Agent, uri: string): Promise<unknown> {
    return agent.callWithProxy('tech.tokimeki.feeds.refreshRecord', undefined, { method: 'POST', data: { uri }, ...PROXY }).catch(() => {});
}

function definitionOf(input: HomePlusFeedInput, updated: boolean): Record<string, unknown> {
    return {
        ...recipeToDefinition(input.recipe, input.name),
        ...(input.description ? { description: input.description } : {}),
        $type: DEFINITION,
        createdAt: input.createdAt,
        ...(updated ? { updatedAt: new Date().toISOString() } : {}),
    };
}

async function putDefinition(agent: Agent, input: HomePlusFeedInput, updated: boolean): Promise<Record<string, unknown>> {
    const record = definitionOf(input, updated);
    await agent.xrpc.post('com.atproto.repo.putRecord', {
        repo: did(agent),
        collection: DEFINITION,
        rkey: input.rkey,
        record,
        validate: false,
    });
    return record;
}

async function putGenerator(agent: Agent, rkey: string, definition: Record<string, unknown>): Promise<void> {
    const composed = await agent.callWithProxy<{ record: Record<string, unknown> }>('tech.tokimeki.feeds.composeGenerator', undefined, {
        method: 'POST',
        data: { definition },
        ...PROXY,
    });
    await agent.xrpc.post('com.atproto.repo.putRecord', {
        repo: did(agent),
        collection: GENERATOR,
        rkey,
        record: composed.record,
    });
}

const generatorWrites = new Map<string, Promise<void>>();

function queueGenerator(agent: Agent, rkey: string, definition: Record<string, unknown>): void {
    const key = `${did(agent)}/${rkey}`;
    const task: Promise<void> = (generatorWrites.get(key) ?? Promise.resolve())
        .then(() => putGenerator(agent, rkey, definition))
        .catch((e) => console.error(e))
        .finally(() => {
            if (generatorWrites.get(key) === task) generatorWrites.delete(key);
        });
    generatorWrites.set(key, task);
}

function generatorSettled(agent: Agent, rkey: string): Promise<void> {
    return generatorWrites.get(`${did(agent)}/${rkey}`) ?? Promise.resolve();
}

function toFeed(agent: Agent, input: HomePlusFeedInput): HomePlusFeed {
    return { rkey: input.rkey, name: input.name, createdAt: input.createdAt, recipe: input.recipe, uri: homePlusUri(did(agent), input.rkey) };
}

export async function listHomePlusFeeds(agent: Agent): Promise<HomePlusFeed[]> {
    const repo = did(agent);
    const feeds: HomePlusFeed[] = [];
    let cursor: string | undefined;
    do {
        const res = await agent.xrpc.get<{ records: { uri: string; value: CustomFeedDefinitionRecord }[]; cursor?: string }>('com.atproto.repo.listRecords', {
            repo,
            collection: DEFINITION,
            limit: 100,
            cursor,
        });
        const rkeys = res.records.map((record) => record.uri.split('/').pop() ?? '');
        for (const [index, record] of res.records.entries()) {
            const rkey = rkeys[index];
            if (!rkey.startsWith(HOME_PLUS_PREFIX)) continue;
            feeds.push({
                rkey,
                uri: homePlusUri(repo, rkey),
                name: record.value.name,
                createdAt: record.value.createdAt,
                recipe: definitionToRecipe(record.value),
            });
        }
        const descending = rkeys.every((rkey, index) => index === 0 || rkeys[index - 1] >= rkey);
        const pastPrefix = rkeys.length > 0 && rkeys[rkeys.length - 1] < HOME_PLUS_PREFIX;
        cursor = descending && pastPrefix ? undefined : res.cursor;
    } while (cursor);
    return feeds;
}

export async function createHomePlusFeed(agent: Agent, recipe: HomePlusRecipe, name: string, description: string): Promise<HomePlusFeed> {
    const input: HomePlusFeedInput = { rkey: newRkey(), name, description, createdAt: new Date().toISOString(), recipe };
    const definition = await putDefinition(agent, input, false);
    await putGenerator(agent, input.rkey, definition);
    const repo = did(agent);
    await Promise.all([refresh(agent, definitionUri(repo, input.rkey)), refresh(agent, homePlusUri(repo, input.rkey))]);
    return toFeed(agent, input);
}

export async function updateHomePlusFeed(agent: Agent, input: HomePlusFeedInput, renamed: boolean): Promise<void> {
    const definition = await putDefinition(agent, input, true);
    await refresh(agent, definitionUri(did(agent), input.rkey));
    if (renamed) queueGenerator(agent, input.rkey, definition);
}

export async function deleteHomePlusFeed(agent: Agent, rkey: string): Promise<void> {
    const repo = did(agent);
    await generatorSettled(agent, rkey);
    await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo, collection: GENERATOR, rkey });
    await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo, collection: DEFINITION, rkey });
    await Promise.all([refresh(agent, definitionUri(repo, rkey)), refresh(agent, homePlusUri(repo, rkey))]);
}

async function hasRecord(agent: Agent, collection: string, rkey: string): Promise<boolean> {
    try {
        await agent.xrpc.get('com.atproto.repo.getRecord', { repo: did(agent), collection, rkey });
        return true;
    } catch (e: any) {
        if (e?.error === 'RecordNotFound' || e?.status === 400 || e?.status === 404) return false;
        throw e;
    }
}

export async function restoreHomePlusFeed(agent: Agent, input: HomePlusFeedInput): Promise<boolean> {
    await generatorSettled(agent, input.rkey);
    const [hasDefinition, hasGenerator] = await Promise.all([
        hasRecord(agent, DEFINITION, input.rkey),
        hasRecord(agent, GENERATOR, input.rkey),
    ]);
    if (hasDefinition && hasGenerator) return false;

    const repo = did(agent);
    const definition = hasDefinition ? definitionOf(input, false) : await putDefinition(agent, input, false);
    if (!hasGenerator) await putGenerator(agent, input.rkey, definition);
    await Promise.all([refresh(agent, definitionUri(repo, input.rkey)), refresh(agent, homePlusUri(repo, input.rkey))]);
    return true;
}
