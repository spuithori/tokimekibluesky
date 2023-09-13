<script lang="ts">
    import { agent } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import MediaTimelineItem from './MediaTimelineItem.svelte';
    import { db } from '$lib/db';
    import { liveQuery } from 'dexie';

    export let _agent = $agent;
    export let column;
    export let index;
    let initialLoadFinished = false;
    let il;

    let paged = 0;
    let feeds;

    if (typeof column.data.cursor !== 'number') {
        column.data.cursor = 0;
    }

    if(!column.data.feed) {
        column.data.feed = [];
    }

    async function getQuery(paged) {
        const feeds = await db.feeds
            .orderBy('indexedAt')
            .reverse()
            .filter(feed => feed.bookmark === column.algorithm.list)
            .offset(paged * 20)
            .limit(20)
            .toArray();
        console.log(feeds);

        return feeds;
    }

    /* $: query = liveQuery(async () => {
        const feeds = await db.feeds
            .orderBy('indexedAt')
            .reverse()
            .filter(feed => feed.bookmark === column.algorithm.list)
            .offset(paged * 20)
            .limit(20)
            .toArray();

        return feeds;
    });

    $: addFeeds($query);

    async function addFeeds(query) {
        if (initialLoadFinished) {
            const feeds = query;
            let uris = feeds.map(feed => feed.uri);
            uris = uris.filter(uri => !column.data.feed.some(tl => tl.post.uri === uri));
            console.log(uris);

            if (!uris.length) {
                return false;
            }

            const res = _agent.getTimeline({algorithm: column.algorithm, uris: uris})
                .then(res => {
                    const posts = res.data.posts.map(post => {
                        const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
                        return { post: post, bookmarkId: id };
                    })
                    column.data.feed = [...posts, ...column.data.feed];
                })
        }
    } */

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        feeds = await getQuery(column.data.cursor);

        if (feeds?.length) {
            const uris = feeds.map(feed => feed.uri);
            const res = await _agent.getTimeline({algorithm: column.algorithm, uris: uris});

            const posts = res.data.posts.map(post => {
                const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
                return { post: post, bookmarkId: id };
            })
            column.data.feed = [...column.data.feed, ...posts];

            //console.log(column.data.feed);

            column.data.cursor = column.data.cursor + 1;
            initialLoadFinished = true;
            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline timeline--{column.style}">
  {#if (column.style === 'default')}
    {#each column.data.feed as data, index (data)}
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each column.data.feed as data (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data} {_agent}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>