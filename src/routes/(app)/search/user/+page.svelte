<script lang="ts">
  import { page } from '$app/stores';
  import { agent } from '$lib/stores';
  import UserItem from "../../profile/[handle]/UserItem.svelte";
  import SearchResultList from "$lib/components/search/SearchResultList.svelte";
  import type { SearchActor } from "$lib/search/types";

  let q = $derived($page.url.searchParams.get('q') ?? '');

  async function load(cursor: string | undefined, signal: AbortSignal) {
      const res = await $agent.xrpc.get<{ actors: SearchActor[]; cursor?: string }>('app.bsky.actor.searchActors', { term: q, limit: 20, cursor }, { signal });
      return { items: res.actors ?? [], cursor: res.cursor };
  }
</script>

{#if q}
  <div class="timeline">
    <SearchResultList {load} key={(user) => user.did}>
      {#snippet item(user)}
        <UserItem {user}></UserItem>
      {/snippet}
    </SearchResultList>
  </div>
{:else}
  <div class="search-empty">
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rainbow"><path d="M22 17a10 10 0 0 0-20 0"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M10 17a2 2 0 0 1 4 0"/></svg>
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
