<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agent, officialListModal} from "$lib/stores";
    import InfiniteLoading from 'svelte-infinite-loading';
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    import {onMount} from "svelte";
    import OfficialListObserver from "$lib/components/list/OfficialListObserver.svelte";

    let lists = [];
    let cursor: string | undefined = '';
    let modLists = [];
    let unique = Symbol();

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            let raw = await $agent.agent.api.app.bsky.graph.getLists({actor: $agent.did(), limit: 100, cursor: cursor});
            cursor = raw.data.cursor;
            lists = [...raw.data.lists.filter(list => list?.purpose === 'app.bsky.graph.defs#modlist')];

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

    onMount(async () => {
        const [muteRes, blockRes] = await Promise.all([$agent.agent.api.app.bsky.graph.getListMutes({limit: 100}), $agent.agent.api.app.bsky.graph.getListBlocks({limit: 100})]);
        const muteLists = muteRes.data.lists.filter(list => list.creator.did !== $agent.did());
        const blockLists = blockRes.data.lists.filter(list => list.creator.did !== $agent.did());

        modLists = Array.from(
            new Map([...muteLists, ...blockLists].map(list => [list.uri, list])).values()
        );
    })
</script>

<svelte:head>
  <title>{$_('settings_embed')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_mod_list')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('mod_list_notice_temp')}</p>

    {#key unique}
      <div class="user-lists-list-wrap">
        <div class="user-lists-list">
          {#each lists as list (list)}
            <OfficialListItem {list} editable={true}>
              <ul class="list-tags">
                <li class="list-tag">{$_('list_label_you')}</li>

                {#if list?.viewer?.muted}
                  <li class="list-tag">{$_('list_label_muted')}</li>
                {/if}

                {#if list?.viewer?.blocked}
                  <li class="list-tag">{$_('list_label_blocked')}</li>
                {/if}
              </ul>
            </OfficialListItem>
          {/each}

          {#each modLists as list (list)}
            <OfficialListItem {list}>
              <ul class="list-tags">
                {#if list?.viewer?.muted}
                  <li class="list-tag">{$_('list_label_muted')}</li>
                {/if}

                {#if list?.viewer?.blocked}
                  <li class="list-tag">{$_('list_label_blocked')}</li>
                {/if}
              </ul>
            </OfficialListItem>
          {/each}
        </div>

        <div class="mod-list-new-buttons text-center">
          <button class="button button--sm" on:click={() => {$officialListModal.open = true}}>{$_('new_create')}</button>
        </div>

        <InfiniteLoading on:infinite={handleLoadMore}>
          <p slot="noMore" class="infinite-nomore"></p>
          <p slot="noResults" class="infinite-nomore"></p>
        </InfiniteLoading>
      </div>
    {/key}
  </div>
</div>

<OfficialListObserver _agent={$agent} on:close={() => {unique = Symbol()}} purpose={'app.bsky.graph.defs#modlist'}></OfficialListObserver>

<style lang="postcss">
  .mod-list-new-buttons {
      margin-top: 16px;
  }
</style>