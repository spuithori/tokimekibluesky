<script>
    import { agent } from '$lib/stores';
    import { onMount } from 'svelte';
    import TimelineItem from '../../TimelineItem.svelte';
    import InfiniteScroll from 'svelte-infinite-scroll';

    export let author = '';
    let feeds = [];
    let finishLoading = false;
    let cursor = '';

    onMount(async () => {
        const raw = await $agent.agent.api.app.bsky.feed.getAuthorFeed({author: author, limit: 30});
        console.log(raw.data.cursor)
        feeds = raw.data.feed;
        cursor = raw.data.cursor;
    });

    const handleLoadMore = async () => {
        const raw = await $agent.agent.api.app.bsky.feed.getAuthorFeed({author: author, limit: 30, before: cursor});
        cursor = raw.data.cursor;

        if (!cursor) {
            finishLoading = true;
        }

        if (!finishLoading) {
            for (const item of raw.data.feed) {
                feeds.push(item);
            }
            feeds = feeds;
        }
    }
</script>

<div class="timeline">
  {#each feeds as data}
    <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
  {/each}

  <InfiniteScroll window threshold="300" on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>