<script>
    import { page } from '$app/stores';
    import TimelineItem from '../TimelineItem.svelte';
    import SearchForm from '../SearchForm.svelte';
    import { agent } from '$lib/stores';
    import { parseISO } from 'date-fns';
    import {_} from "svelte-i18n";
    let searchFeeds = [];
    let feeds = [];
    let cursor = '';
    import { fly } from 'svelte/transition';
    import InfiniteLoading from "svelte-infinite-loading";

    let il;

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getFeedsFromRecords(uris) {
        const res = await $agent.agent.api.app.bsky.feed.getPosts({uris: uris});
        let feeds = [];
        res.data.posts.forEach(post => {
            feeds.push({
                post: post,
            })
        });
        return feeds;
    }

    async function getSearchFeeds(query) {
        if (query) {
            console.log('refresh')
            feeds = [];
            cursor = 0;
            il.$$.update();
        }
    }

    function splitUris(uris, q = 20) {
        const length = Math.ceil(uris.length / q)
        return new Array(length)
            .fill()
            .map((_, i) => uris.slice(i * q, (i + 1) * q));
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        const res = await fetch('https://search.bsky.social/search/posts?q=' + encodeURIComponent($page.url.searchParams.get('q')) + '&offset=' + cursor)
            .then(response => response.json())
            .then(data => searchFeeds = data);

        if ($page.url.searchParams.get('q') && searchFeeds.length) {
            const uris = searchFeeds.map(feed => {
                return 'at://' + feed.user.did + '/' + feed.tid;
            });

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
            tempFeeds.sort((a, b) => {
                return parseISO(b.post.indexedAt).getTime() - parseISO(a.post.indexedAt).getTime();
            });

            feeds = [...feeds, ...tempFeeds];

            cursor = cursor + 30;

            loaded();
        } else {
            complete();
        }
    }
</script>

<div>
  <h1 class="page-nav-title" in:fly={{ x: 10, duration: 100, delay: 100 }}>{$_('search_button')}</h1>

  <SearchForm></SearchForm>

  <div class="timeline">
    {#each feeds as data (data)}
      <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
    {:else}
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
</div>

<style>

</style>