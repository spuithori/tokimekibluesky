<script>
    import { page } from '$app/stores';
    import { agent } from '$lib/stores';
    let searchFeeds = [];
    let feeds = [];
    let cursor = 0;
    import InfiniteLoading from "svelte-infinite-loading";
    import TimelineItem from "../../TimelineItem.svelte";

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSearchFeeds(query) {
        if (query) {
            feeds = [];
            cursor = 0;
        }
    }

    function splitUris(uris, q = 20) {
        const length = Math.ceil(uris.length / q)
        return new Array(length)
            .fill()
            .map((_, i) => uris.slice(i * q, (i + 1) * q));
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await fetch('/api/search', {
            method: 'POST',
            body: JSON.stringify({
                q: '',
                hashtags: encodeURIComponent($page.url.searchParams.get('q')),
                limit: 20,
                offset: cursor,
            })
        });
        const obj = await res.json();
        searchFeeds = obj.hits;
        console.log(obj);

        if ($page.url.searchParams.get('q') && searchFeeds.length) {
            const uris = searchFeeds.map(feed => feed.uri);

            let tempFeeds = [];
            const urisArray = splitUris(uris);
            const ress = await Promise.allSettled(urisArray.map(uris => {
                return $agent.agent.api.app.bsky.feed.getPosts({uris: uris})
            }))
                .then(results => results.forEach(result => {
                    if (result.status === 'fulfilled') {
                        console.log(result.value)
                        result.value.data.posts.forEach(post => {
                            tempFeeds.push({
                                post: post,
                            })
                        })
                    }
                }))

            tempFeeds = tempFeeds.filter(feed => feed.post?.indexedAt);

            feeds = [...feeds, ...tempFeeds];

            cursor = cursor + 20;

            loaded();
        } else {
            complete();
        }
    }
</script>

{#key $page.url.searchParams.get('q')}
  <div class="timeline">
    {#each feeds as data (data)}
      <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
    {:else}
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
{/key}