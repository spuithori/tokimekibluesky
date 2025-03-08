<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {isAfterReload, settings} from '$lib/stores';
    import UserItem from '../UserItem.svelte';
    import type { Snapshot } from './$types';
    import {tick} from "svelte";
    import {getAgentContext} from "../state.svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    const agentContext = getAgentContext();
    let follows = $state([]);
    let cursor = '';
    let scrollY = 0;
    let tempActive = $state(false);

    export const snapshot: Snapshot = {
        capture: () => [follows, cursor, $settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
        restore: (value) => {
          if(!$isAfterReload) {
            [follows, cursor, scrollY] = value;

            tick().then(() => {
                if ($settings.design.layout === 'decks') {
                    document.querySelector('.modal-page-content').scroll(0, scrollY);
                } else {
                    document.querySelector(':root').scroll(0, scrollY);
                }
            });
          }

          isAfterReload.set(false);
        }
    };

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await agentContext.agent.agent.api.app.bsky.graph.getFollows({actor: data.params.handle, limit: 20, cursor: cursor});
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

    tick().then(() => {
        tempActive = true;
    })
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_follows')} - TOKIMEKI</title>
</svelte:head>

{#if (tempActive)}
  <div class="user-items-list">
    <div class="user-timeline">
      {#each follows as user (user)}
        <UserItem {user} _agent={agentContext.agent}></UserItem>
      {/each}

      <Infinite oninfinite={handleLoadMore}></Infinite>
    </div>
  </div>
{/if}