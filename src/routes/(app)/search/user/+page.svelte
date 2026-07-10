<script lang="ts">
  import Rainbow from '@lucide/svelte/icons/rainbow';
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
