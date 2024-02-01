<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import InfiniteLoading from 'svelte-infinite-loading';
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    import {getDidByHandle} from "$lib/util";
    let lists = [];
    let cursor: string | undefined = '';

    export let data: LayoutData;

    async function handleLoadMore({ detail: { loaded, complete } }) {
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

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">
  .user-lists-list-wrap {
      padding: 8px 0;
  }

  .user-lists-list {

  }
</style>