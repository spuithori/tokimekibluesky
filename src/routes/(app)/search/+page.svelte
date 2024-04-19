<script>
    import { page } from '$app/stores';
    import TimelineItem from '../TimelineItem.svelte';
    import {agent, columns} from '$lib/stores';
    import { parseISO } from 'date-fns';
    let feeds = [];
    let cursor = 0;
    let isLoaded = false;
    let isColumnAdded = false;
    let isSafety = false;
    import InfiniteLoading from "svelte-infinite-loading";
    import {_} from "svelte-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import { toast } from "svelte-sonner";
    import { PUBLIC_SUICIDE_WORDS } from '$env/static/public';
    import SuicideSafety from "$lib/components/safety/SuicideSafety.svelte";

    const words = PUBLIC_SUICIDE_WORDS.split(',');
    if (words.includes($page.url.searchParams.get('q'))) {
        isSafety = true;
    }

    async function addColumn() {
        if (!$page.url.searchParams.get('q')) {
            return false;
        }

        const _column = {
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'search',
                algorithm: $page.url.searchParams.get('q') || '',
                name: $_('search') + ' "' + $page.url.searchParams.get('q') + '"',
            },
            style: 'default',
            settings: defaultDeckSettings,
            did: $agent.did(),
            handle: $agent.handle(),
            data: {
                feed: [],
                cursor: '',
            }
        }

        try {
            $columns = [...$columns, _column];

            toast.success($_('column_added'));
            isColumnAdded = true;
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
            let res = await $agent.agent.api.app.bsky.feed.searchPosts({q: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
            cursor = res.data.cursor;

            let tempFeeds = [];
            res.data.posts.forEach(post => {
                tempFeeds.push({
                    post: post,
                })
            });
            tempFeeds = tempFeeds.filter(feed => feed.post?.indexedAt);
            tempFeeds.sort((a, b) => {
                return parseISO(b.post.indexedAt).getTime() - parseISO(a.post.indexedAt).getTime();
            });
            tempFeeds = tempFeeds;

            feeds = [...feeds, ...tempFeeds];

            if (cursor) {
                loaded();
            } else {
                complete();
            }

            isLoaded = true;
        } catch (e) {
            complete();
        }
    }
</script>

<div class="timeline">
    {#if isSafety}
        <SuicideSafety></SuicideSafety>
    {/if}

    {#each feeds as data (data)}
        <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
    {:else}
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
        <p slot="noMore" class="infinite-nomore">
            {$_('no_more')}
        </p>
        <p slot="noResults" class="infinite-nomore">
            {$_('no_results_search')}
        </p>
    </InfiniteLoading>
</div>

{#if (isLoaded)}
    <div class="search-column-adder">
        <button class="button button--shadow button--sm" disabled={isColumnAdded} on:click={addColumn}>{$_('feed_quick_add')}</button>
    </div>
{/if}

<style lang="postcss">
    .search-column-adder {
        position: sticky;
        bottom: 24px;
        display: flex;
        justify-content: flex-end;
        padding: 0 24px;
        pointer-events: none;

        @media (max-width: 767px) {
            bottom: 80px;
            padding: 0 20px;
        }

        .button {
            pointer-events: auto;
        }
    }
</style>