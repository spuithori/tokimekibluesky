<script lang="ts">
    import { _ } from 'svelte-i18n';
    import Infinite from "$lib/components/utils/Infinite.svelte";
    import {getServiceAuthToken} from "$lib/util";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import MochottArticleCard from "$lib/components/mochott/MochottArticleCard.svelte";

    let { index, _agent, isJunk = false, unique, isSplit = false, column: columnProp = undefined } = $props();

    const columnState = getColumnState(isJunk);
    const column = columnProp ?? columnState.getColumn(index);

    let isEmpty = $state(false);
    let isError = $state(false);

    const MOCHOTT_API_BASE = 'https://mochott.site';
    const isNetworkFeed = column.algorithm?.type === 'networkFeed';

    async function fetchFeed(cursor?: string): Promise<{ feed: any[], cursor?: string }> {
        const params = new URLSearchParams({ limit: '20' });
        if (cursor) {
            params.set('cursor', cursor);
        }

        let response: Response;

        if (isNetworkFeed) {
            response = await fetch(`${MOCHOTT_API_BASE}/xrpc/site.mochott.feed.getNetworkFeed?${params}`);
        } else {
            const token = await getServiceAuthToken({
                aud: 'did:web:mochott.site',
                lxm: 'site.mochott.feed.getTimeline',
            }, _agent);

            response = await fetch(`${MOCHOTT_API_BASE}/xrpc/site.mochott.feed.getTimeline?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
        }

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        return await response.json();
    }

    const handleLoadMore = async (loaded: () => void, complete: () => void) => {
        try {
            const result = await fetchFeed(column.data.cursor || undefined);

            if (result.feed.length === 0 && columnState.getFeed(column.id).length === 0) {
                isEmpty = true;
                complete();
                return;
            }

            column.data.cursor = result.cursor || '';
            columnState.replaceFeed(column.id, f => [...f, ...result.feed]);

            if (result.cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error('Failed to fetch mochott timeline:', e);
            isError = true;
            complete();
        }
    }

    export async function refresh() {
        isEmpty = false;
        isError = false;
        columnState.clearFeed(column.id);
        column.data.cursor = '';
    }
</script>

<div class="mochott-timeline">
    {#if isEmpty}
        <div class="mochott-timeline__empty">
            <p>{$_('blog_empty')}</p>
        </div>
    {:else if isError}
        <div class="mochott-timeline__error">
            <p>{$_('blog_error')}</p>
        </div>
    {:else}
        <div class="mochott-timeline__list">
            {#each columnState.getFeed(column.id) as article (article.uri)}
                <MochottArticleCard {article}></MochottArticleCard>
            {/each}
        </div>
    {/if}

    {#key unique}
        <Infinite oninfinite={handleLoadMore}></Infinite>
    {/key}
</div>

<style lang="postcss">
    .mochott-timeline {
        padding: 8px;
    }

    .mochott-timeline__empty,
    .mochott-timeline__error {
        text-align: center;
        padding: 40px 20px;
        color: var(--text-color-3);
    }

    .mochott-timeline__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
</style>
