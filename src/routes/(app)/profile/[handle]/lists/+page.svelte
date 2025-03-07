<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    import {getDidByHandle} from "$lib/util";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    let lists = $state([]);
    let cursor: string | undefined = '';

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await $agent.agent.api.app.bsky.graph.getLists({actor: await getDidByHandle(data.params.handle, $agent), limit: 20, cursor: cursor});
            cursor = raw.data.cursor;
            lists = [...lists, ...raw.data.lists];
            console.log(lists);

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
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_lists')} - TOKIMEKI</title>
</svelte:head>

<div class="user-lists-list-wrap">
  <div class="user-lists-list">
    {#each lists as list (list)}
      <OfficialListItem {list}></OfficialListItem>
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
  .user-lists-list-wrap {
      padding: 8px 0;
  }

  .user-lists-list {

  }
</style>