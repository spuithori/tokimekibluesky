<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import { onMount } from 'svelte';
    import TimelineItem from '../../../TimelineItem.svelte';
    import InfiniteScroll from "svelte-infinite-scroll";

    export let author = '';
    let feeds = [];
    let finishLoading = false;
    let cursor = '';

    export let data: LayoutData;

    function getFeedsFromRecords(records) {
        const promises = records.map(record => {
            return $agent.getFeed(record.value.subject.uri);
        })

        Promise.allSettled(promises)
            .then((results) => results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    feeds.push(result.value);
                }
                feeds = feeds;
            }))
    }

    async function getRecords() {
        return await $agent.agent.api.com.atproto.repo.listRecords({
            collection: "app.bsky.feed.like",
            limit: 20,
            reverse: false,
            cursor: cursor,
            repo: data.params.handle});
    }

    onMount(async () => {
        const likesArrayRes = await getRecords();
        cursor = likesArrayRes.data.cursor;

        getFeedsFromRecords(likesArrayRes.data.records);
    })

    const handleLoadMore = async () => {
        const likesArrayRes = await getRecords();
        cursor = likesArrayRes.data.cursor;

        if (!cursor) {
            finishLoading = true;
        }

        if (!finishLoading) {
            getFeedsFromRecords(likesArrayRes.data.records);
        }
    }
</script>

<div class="timeline">
  {#each feeds as data (data)}
    <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
  {/each}

  <InfiniteScroll window threshold="300" on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>