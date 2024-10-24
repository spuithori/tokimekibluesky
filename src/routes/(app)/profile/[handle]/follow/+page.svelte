<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent, isAfterReload, settings} from '$lib/stores';
    import UserItem from '../UserItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import type { Snapshot } from './$types';
    let follows = $state([]);
    let cursor = '';
    let scrollY = 0;

    export const snapshot: Snapshot = {
        capture: () => [follows, cursor, $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
        restore: (value) => {
          if(!$isAfterReload) {
            [follows, cursor, scrollY] = value;

            setTimeout(() => {
                if ($settings.design.layout === 'decks') {
                    document.querySelector('.modal-page-content').scroll(0, scrollY);
                } else {
                    document.querySelector(':root').scroll(0, scrollY);
                }
            }, 0)
          }

          isAfterReload.set(false);
        }
    };

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            let raw = await $agent.agent.api.app.bsky.graph.getFollows({actor: data.params.handle, limit: 20, cursor: cursor});
            cursor = raw.data.cursor;
            follows = [...new Map([...follows, ...raw.data.follows].map(follow => [follow.did, follow])).values()];

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
  <title>{data.params.handle} {$_('page_title_follows')} - TOKIMEKI</title>
</svelte:head>

<div class="user-items-list">
  <div class="user-timeline">
    {#each follows as user (user)}
      <UserItem user={user}></UserItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      {#snippet noMore()}
            <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
          {/snippet}
      {#snippet noResults()}
            <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
          {/snippet}
    </InfiniteLoading>
  </div>
</div>
