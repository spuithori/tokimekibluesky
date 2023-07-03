<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {agent, settings} from '$lib/stores';
    import { page } from '$app/stores';
    import TimelineItem from "../../../../TimelineItem.svelte";
    import InfiniteLoading from 'svelte-infinite-loading';
    import {beforeNavigate} from "$app/navigation";

    let timeline = [];
    let cursor = undefined;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const uri = 'at://' + $page.params.handle + '/app.bsky.feed.generator/' + $page.params.id;
        const res = await $agent.getTimeline({limit: 20, cursor: cursor, algorithm: {
            type: 'custom',
            algorithm: uri,
            }});
        cursor = res.data.cursor;

        if (cursor) {
            timeline = [...timeline, ...res.data.feed]

            loaded();
        } else {
            complete();
        }
    }

    beforeNavigate(async() => {
        timeline = [];
        cursor = undefined;
    })
</script>

<div class="timeline timeline--main">
  {#each timeline as data, index (data)}
    <TimelineItem data={ data } index={index}></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">

</style>