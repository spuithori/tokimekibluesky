<script lang="ts">
    import { agent } from '$lib/stores';
    import { page } from '$app/stores';
    import TimelineItem from '../../../../TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import { beforeNavigate } from '$app/navigation';
    import { onMount } from 'svelte';
    import FeedsItem from '$lib/components/feeds/FeedsItem.svelte';

    let timeline = [];
    let cursor = undefined;
    let feed;
    let savedFeeds = [];

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

    async function getSavedFeeds () {
        const preferenceRes = await $agent.agent.api.app.bsky.actor.getPreferences()
        const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
        savedFeeds = preference[0]?.saved || [];
    }

    function isSaved(feed) {
        const uri = feed.uri;
        return savedFeeds.includes(uri);
    }

    beforeNavigate(async() => {
        timeline = [];
        cursor = undefined;
    });

    onMount(async () => {
        await getSavedFeeds();
        const res = await $agent.agent.api.app.bsky.feed.getFeedGenerator({feed: 'at://' + $page.params.handle + '/app.bsky.feed.generator/' + $page.params.id});

        if (res.data.isOnline) {
            feed = res.data.view;
        }
    })
</script>

{#if (feed)}
  <FeedsItem feed={feed} subscribed={isSaved(feed)} layout={'page'} on:close></FeedsItem>
{/if}

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