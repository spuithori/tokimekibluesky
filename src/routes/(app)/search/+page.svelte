<script>
    import { page } from '$app/stores';
    import TimelineItem from '../TimelineItem.svelte';
    import { agent } from '$lib/stores';
    import { parseISO } from 'date-fns';
    let feeds = [];
    let cursor = 0;
    import InfiniteLoading from "svelte-infinite-loading";
    import {_} from "svelte-i18n";

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
            let res = await $agent.agent.api.app.bsky.feed.searchPosts({q: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
            cursor = res.data.cursor;

            console.log(cursor);

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

            if (cursor) {
                feeds = [...feeds, ...tempFeeds];

                loaded();
            } else {
                complete();
            }
        } catch (e) {
            complete();
        }
    }
</script>

<div class="timeline">
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