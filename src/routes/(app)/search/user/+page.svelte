<script>
    import { page } from '$app/stores';
    import { agent } from '$lib/stores';
    let feeds = [];
    let cursor = 0;
    import InfiniteLoading from "svelte-infinite-loading";
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    import {_} from "svelte-i18n";
    let users = [];

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSearchFeeds(query) {
        if (query) {
            users = [];
            cursor = undefined;
        }
    }

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            let raw = await $agent.agent.api.app.bsky.actor.searchActors({term: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
            cursor = raw.data.cursor;
            users = [...users, ...raw.data.actors];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            complete();
        }
    }
</script>

{#key $page.url.searchParams.get('q')}
  <div class="timeline">
    {#each users as user (user)}
      <UserItem user={user}></UserItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
        <p slot="noMore" class="infinite-nomore">
            {$_('no_more')}
        </p>
        <p slot="noResults" class="infinite-nomore">
            {$_('no_results_search')}
        </p>
    </InfiniteLoading>
  </div>
{/key}
