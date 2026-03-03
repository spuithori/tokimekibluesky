<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent, starterPackModal} from "$lib/stores";
    import StarterPackItem from "$lib/components/starterpack/StarterPackItem.svelte";
    import StarterPackObserver from "$lib/components/starterpack/StarterPackObserver.svelte";
    import {getDidByHandle} from "$lib/util";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let starterPacks = $state([]);
    let cursor: string | undefined = '';
    let isOwner = $state(false);

    interface Props {
      data: LayoutData;
    }

    let { data }: Props = $props();

    async function checkOwner() {
        try {
            const did = await getDidByHandle(data.params.handle, $agent);
            isOwner = did === $agent.did();
        } catch (e) {
            console.error(e);
        }
    }

    checkOwner();

    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await $agent.agent.api.app.bsky.graph.getActorStarterPacks({actor: await getDidByHandle(data.params.handle, $agent), limit: 20, cursor: cursor});
            cursor = raw.data.cursor;
            starterPacks = [...starterPacks, ...raw.data.starterPacks];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    function handleCreate() {
        $starterPackModal = { open: true, uri: '' };
    }

    async function handleObserverClose() {
        starterPacks = [];
        cursor = '';
        try {
            let raw = await $agent.agent.api.app.bsky.graph.getActorStarterPacks({actor: await getDidByHandle(data.params.handle, $agent), limit: 20});
            cursor = raw.data.cursor;
            starterPacks = raw.data.starterPacks;
        } catch (e) {
            console.error(e);
        }
    }
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_starter_packs')} - TOKIMEKI</title>
</svelte:head>

<div class="user-starter-packs-wrap">
  {#if isOwner}
    <div class="user-starter-packs-create">
      <button class="button button--sm" onclick={handleCreate}>{$_('starter_pack_create')}</button>
    </div>
  {/if}

  <div class="user-starter-packs">
    {#each starterPacks as pack (pack.uri)}
      <StarterPackItem starterPack={pack}></StarterPackItem>
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<StarterPackObserver onclose={handleObserverClose}></StarterPackObserver>

<style lang="postcss">
  .user-starter-packs-wrap {
    padding: 8px 16px;
  }

  .user-starter-packs-create {
    margin-bottom: 16px;
    text-align: right;
  }
</style>
