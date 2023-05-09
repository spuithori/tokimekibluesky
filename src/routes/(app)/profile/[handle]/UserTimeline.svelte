<script>
    import { agent } from '$lib/stores';
    import TimelineItem from '../../TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import toast from "svelte-french-toast";
    import { _ } from 'svelte-i18n';

    export let author = '';
    let feeds = [];
    let cursor = '';
    let il;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        try {
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
        } catch(e) {
            if (e.error === 'BlockedActor') {
                toast.error($_('error_get_posts_because_blocking'));
                complete();
            }

            if (e.error === 'BlockedByActor') {
                toast.error($_('error_get_posts_because_blocked'));
                complete();
            }
        }
    }
</script>

<div class="timeline">
  {#each feeds as data, index}
    <TimelineItem data={ data } isPrivate={ true } index={index}></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>