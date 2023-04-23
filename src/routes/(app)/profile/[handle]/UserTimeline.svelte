<script>
    import { agent } from '$lib/stores';
    import { onMount } from 'svelte';
    import TimelineItem from '../../TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';

    export let author = '';
    let feeds = [];
    let cursor = '';

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const raw = await $agent.agent.api.app.bsky.feed.getAuthorFeed({actor: author, limit: 30, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            for (const item of raw.data.feed) {
                feeds.push(item);
            }
            feeds = feeds;

            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline">
  {#each feeds as data}
    <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>