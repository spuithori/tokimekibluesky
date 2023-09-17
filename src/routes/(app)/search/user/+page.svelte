<script>
    import { page } from '$app/stores';
    import { agent } from '$lib/stores';
    let feeds = [];
    let cursor = 0;
    import InfiniteLoading from "svelte-infinite-loading";
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    let users = [];

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSearchFeeds(query) {
        if (query) {
            users = [];
            cursor = undefined;
        }
    }

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.actor.searchActors({term: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            users = [...users, ...raw.data.actors];

            loaded();
        } else {
            complete();
        }
    }
</script>

{#key $page.url.searchParams.get('q')}
  <div class="user-timeline">
    {#each users as user (user)}
      <UserItem user={user}></UserItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
{/key}
