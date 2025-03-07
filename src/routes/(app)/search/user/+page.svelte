<script>
  import { page } from '$app/stores';
  import { agent } from '$lib/stores';
  import UserItem from "../../profile/[handle]/UserItem.svelte";
  import {tick} from "svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  let feeds = [];
  let cursor = 0;
  let users = $state([]);
  let tempActive = $state(false);

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

  tick().then(() => {
      tempActive = true;
  })
</script>

{#if (tempActive)}
  {#if $page.url.searchParams.get('q')}
    <div class="timeline">
      {#each users as user (user)}
        <UserItem user={user}></UserItem>
      {/each}

      <Infinite oninfinite={handleLoadMore}></Infinite>
    </div>
  {:else}
    <div class="search-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rainbow"><path d="M22 17a10 10 0 0 0-20 0"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M10 17a2 2 0 0 1 4 0"/></svg>
    </div>
  {/if}
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