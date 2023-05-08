<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import TimelineItem from '../../../TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';

    export let author = '';
    let feeds = [];
    let cursor = '';

    export let data: LayoutData;

    async function getFeedsFromRecords(records) {
        const uris = records.map(record => {
            return record.value.subject.uri;
        })

        const res = await $agent.agent.api.app.bsky.feed.getPosts({uris: uris});
        let feeds = [];
        res.data.posts.forEach(post => {
            feeds.push({
                post: post,
            })
        });
        return  feeds;
    }

    async function getRecords() {
        return await $agent.agent.api.com.atproto.repo.listRecords({
            collection: "app.bsky.feed.like",
            limit: 10,
            reverse: false,
            cursor: cursor,
            repo: data.params.handle});
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const likesArrayRes = await getRecords();
        cursor = likesArrayRes.data.cursor;

        if (cursor) {
            feeds = [...feeds, ...await getFeedsFromRecords(likesArrayRes.data.records)];
            console.log(feeds)
            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline">
  {#each feeds as data (data)}
    <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>