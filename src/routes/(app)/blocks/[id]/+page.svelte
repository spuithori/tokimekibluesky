<script lang="ts">
  import {_} from "svelte-i18n";
  import {page} from "$app/stores";
  import {agents} from "$lib/stores";
  import BlockMutesItem from "$lib/components/profile/BlockMutesItem.svelte";
  import {getAccountIdByDid} from "$lib/util";
  import Infinite from "$lib/components/utils/Infinite.svelte";
  import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

  let blocks = $state([]);
  let cursor: string | undefined = '';
  const _agent = $agents.get(getAccountIdByDid($agents, $page.params.id));

  async function handleLoadMore(loaded, complete) {
    try {
      let res = await _agent.agent.api.app.bsky.graph.getBlocks({limit: 20, cursor: cursor});
      cursor = res.data.cursor;
      blocks = [...blocks, ...res.data.blocks];

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

<SettingsHeader>
  {$_('blocks_list')}
</SettingsHeader>

{#if _agent}
  <div class="timeline">
    {#each blocks as user}
      <BlockMutesItem {user} {_agent}></BlockMutesItem>
    {/each}

    <Infinite oninfinite={handleLoadMore}></Infinite>
  </div>
{:else}
  <div class="timeline">
    <p>{$_('error_missing_parameter_account')}</p>
  </div>
{/if}
