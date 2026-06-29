<script>
    import Rainbow from '@lucide/svelte/icons/rainbow';
  import { page } from '$app/stores';
  import { agent } from '$lib/stores';
  import UserItem from "../../profile/[handle]/UserItem.svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  let feeds = [];
  let cursor = 0;
  let users = $state([]);

  $effect(() => {
      getSearchFeeds($page.url.searchParams.get('q'));
  })

  async function getSearchFeeds(query) {
      if (query) {
          users = [];
          cursor = undefined;
      }
  }

  async function handleLoadMore(loaded, complete) {
      try {
          let raw = await $agent.xrpc.get('app.bsky.actor.searchActors', {term: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
          cursor = raw.cursor;
          users = [...users, ...raw.actors];

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

{#if $page.url.searchParams.get('q')}
  <div class="timeline">
    {#each users as user (user)}
      <UserItem user={user}></UserItem>
    {/each}

    <Infinite oninfinite={handleLoadMore}></Infinite>
  </div>
{:else}
  <div class="search-empty">
    <Rainbow size={128} color="var(--border-color-1)" />
  </div>
{/if}

<style lang="postcss">
    .search-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 0;
    }
</style>