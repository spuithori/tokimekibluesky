<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import InfiniteLoading from 'svelte-infinite-loading';
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    let lists = [];
    let cursor: string | undefined = '';

    export let data: LayoutData;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.graph.getLists({actor: data.params.handle, limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            lists = [...lists, ...raw.data.lists];

            loaded();
        } else {
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