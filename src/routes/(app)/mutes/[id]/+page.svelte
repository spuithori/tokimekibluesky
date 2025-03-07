<script lang="ts">
  import PageModal from "$lib/components/ui/PageModal.svelte";
  import {_} from "svelte-i18n";
  import {page} from "$app/stores";
  import {agents} from "$lib/stores";
  import BlockMutesItem from "$lib/components/profile/BlockMutesItem.svelte";
  import {getAccountIdByDid} from "$lib/util";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  let mutes = $state([]);
  let cursor: string | undefined = '';
  const _agent = $agents.get(getAccountIdByDid($agents, $page.params.id));

  async function handleLoadMore(loaded, complete) {
      try {
          let res = await _agent.agent.api.app.bsky.graph.getMutes({limit: 20, cursor: cursor});
          cursor = res.data.cursor;
          mutes = [...mutes, ...res.data.mutes];

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
  <title>{$_('mutes_list')} ({_agent?.agent.session.handle || ''}) - TOKIMEKI</title>
</svelte:head>

<PageModal>
  <section class="page">
    <div class="column-heading">
      <div class="column-heading__buttons">
        <button class="settings-back" onclick={() => {history.back()}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
      </div>

      <h1 class="column-heading__title">{$_('mutes_list')} ({_agent?.agent.session.handle || 'error'})</h1>

      <div class="column-heading__buttons column-heading__buttons--right">
        <a class="settings-back" href="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </a>
      </div>
    </div>
  </section>

  {#if _agent}
    <div class="timeline">
      {#each mutes as user}
        <BlockMutesItem category="mute" {user} {_agent}></BlockMutesItem>
      {/each}

      <Infinite oninfinite={handleLoadMore}></Infinite>
    </div>
  {:else}
    <div class="timeline">
      <p>{$_('error_missing_parameter_account')}</p>
    </div>
  {/if}
</PageModal>