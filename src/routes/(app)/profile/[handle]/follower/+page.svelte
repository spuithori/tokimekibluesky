<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent, isAfterReload, settings} from "$lib/stores";
    import UserItem from "../UserItem.svelte";
    import InfiniteLoading from 'svelte-infinite-loading';
    import type { Snapshot } from './$types';
    let followers = [];
    let cursor = '';
    let scrollY = 0;

    export const snapshot: Snapshot = {
        capture: () => [followers, cursor, $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
        restore: (value) => {
          if(!$isAfterReload) {
            [followers, cursor, scrollY] = value;

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
    export let data: LayoutData;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.graph.getFollowers({actor: data.params.handle, limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            followers = [...new Map([...followers, ...raw.data.followers].map(follower => [follower.did, follower])).values()];

            loaded();
        } else {
            complete();
        }
    }
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_followers')} - TOKIMEKI</title>
</svelte:head>

<div class="user-items-list">
  <div class="user-timeline">
    {#each followers as user (user)}
      <UserItem user={user}></UserItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      <p slot="noMore" class="infinite-nomore">もうないよ</p>
    </InfiniteLoading>
  </div>
</div>
