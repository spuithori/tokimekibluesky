<script lang="ts">
    import { agent } from '$lib/stores';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {getBookmarkFeed} from "$lib/bookmark";
    import TimelineItem from "../../TimelineItem.svelte";

    export let _agent = $agent;
    export let id;
    let feed = [];
    let cursor = 0;
    let initialLoadFinished = false;
    let feeds;

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        feeds = await getBookmarkFeed(id, cursor);

        if (feeds?.length) {
            const uris = feeds.map(feed => feed.uri);
            const res = await _agent.agent.api.app.bsky.feed.getPosts({uris: uris});

            const posts = res.data.posts.map(post => {
                const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
                return { post: post, bookmarkId: id };
            })
            feed = [...feed, ...posts];

            cursor = cursor + 1;
            initialLoadFinished = true;
            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline">
  {#each feed as data, index (data)}
    <TimelineItem data={data} index={index} {_agent}></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>
