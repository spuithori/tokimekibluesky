<script>
    import { page } from '$app/stores';
    import TimelineItem from '../TimelineItem.svelte';
    import SearchForm from '../SearchForm.svelte';
    import { agent } from '$lib/stores';
    import { parseISO } from 'date-fns';
    let searchFeeds = [];
    let feeds = [];

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSearchFeeds(query) {
        feeds = [];

        const res = await fetch('https://search.bsky.social/search/posts?q=' + encodeURIComponent(query))
            .then(response => response.json())
            .then(data => searchFeeds = data);

        const threads = [];
        for (const feed of searchFeeds) {
            const uri = 'at://' + feed.user.did + '/' + feed.tid;
            threads.push($agent.agent.api.app.bsky.feed.getPostThread({uri: uri}));
        }
        await Promise.allSettled(threads)
            .then(results => results.forEach(result => {
                if (result.status === 'fulfilled') {
                    feeds.push(result.value.data.thread)
                }
            }));

        feeds.sort((a, b) => {
            return parseISO(b.post.indexedAt).getTime() - parseISO(a.post.indexedAt).getTime();
        })

        feeds = feeds;
    }
</script>

<div>
  <SearchForm></SearchForm>

  <div class="timeline">
    {#each feeds as data (data)}
      <TimelineItem data={ data } isPrivate={ true }></TimelineItem>
    {:else}
    {/each}
  </div>
</div>

<style>

</style>