<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, timeline, cursor, settings, timelineStyle} from '$lib/stores';
    import { page } from '$app/stores';
    import TimelineItem from "../../../../TimelineItem.svelte";
    import InfiniteLoading from 'svelte-infinite-loading';
    import MediaTimelineItem from "../../../../MediaTimelineItem.svelte";

    timeline.set([]);
    cursor.set(undefined);

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const uri = 'at://' + $page.params.handle + '/app.bsky.feed.generator/' + $page.params.id;
        const res = await $agent.getTimeline({limit: 20, cursor: $cursor, algorithm: {
            type: 'custom',
            algorithm: uri,
            }});
        cursor.set(res.data.cursor);

        if ($cursor) {
            timeline.update(function (tl) {
                return [...tl, ...res.data.feed];
            });
            console.log($timeline);

            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline timeline--main" class:hide-repost={$settings?.timeline.hideRepost} class:hide-reply={$settings?.timeline.hideReply}>
  {#if ($timelineStyle === 'default')}
    {#each $timeline as data, index (data)}
      <TimelineItem data={ data } index={index}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timeline as data, index (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">

</style>