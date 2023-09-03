<script lang="ts">
    import { agent, cursor } from '$lib/stores';
    import { timeline, hideRepost, hideReply, currentAlgorithm } from '$lib/stores';
    import InfiniteLoading from 'svelte-infinite-loading';
    import MediaTimelineItem from './MediaTimelineItem.svelte';
    import { afterUpdate } from 'svelte';

    export let isRefreshing;
    let il;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        if (!isRefreshing) {
            const data = await $agent.getMediaTimeline({limit: 25, cursor: $cursor, algorithm: $currentAlgorithm});
            cursor.set(data.cursor);

            if ($cursor) {
                timeline.update(function (tl) {
                    return [...tl, ...data.feed];
                });

                loaded();
            } else {
                complete();
            }
        }
    }

    afterUpdate(async() => {
        il.$$.update();
    })
</script>

<div class="" class:hide-repost={$hideRepost === 'true'} class:hide-reply={$hideReply === 'true'}>
  <div class="media-list">
    {#each $timeline as data (data)}
      {#if (data.post.embed?.images)}
        <MediaTimelineItem data={data}></MediaTimelineItem>
      {/if}
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">

</style>