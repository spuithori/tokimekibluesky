<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import {agent, officialListModal} from "$lib/stores";
    import OfficialListItem from "$lib/components/list/OfficialListItem.svelte";
    import {onMount} from "svelte";
    import OfficialListObserver from "$lib/components/list/OfficialListObserver.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";

    let lists = $state([]);
    let cursor: string | undefined = '';
    let modLists = $state([]);
    let unique = $state(Symbol());

    async function handleLoadMore(loaded, complete) {
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
  <title>{m.settings_embed()} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {m.settings_mod_list()}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{m.mod_list_notice_temp()}</p>

    {#key unique}
      <div class="user-lists-list-wrap">
        <div class="user-lists-list">
          {#each lists as list (list)}
            <OfficialListItem {list} editable={true}>
              <ul class="list-tags">
                <li class="list-tag">{m.list_label_you()}</li>

                {#if list?.viewer?.muted}
                  <li class="list-tag">{m.list_label_muted()}</li>
                {/if}

                {#if list?.viewer?.blocked}
                  <li class="list-tag">{m.list_label_blocked()}</li>
                {/if}
              </ul>
            </OfficialListItem>
          {/each}

          {#each modLists as list (list)}
            <OfficialListItem {list}>
              <ul class="list-tags">
                {#if list?.viewer?.muted}
                  <li class="list-tag">{m.list_label_muted()}</li>
                {/if}

                {#if list?.viewer?.blocked}
                  <li class="list-tag">{m.list_label_blocked()}</li>
                {/if}
              </ul>
            </OfficialListItem>
          {/each}
        </div>

        <div class="mod-list-new-buttons text-center">
          <button class="button button--sm" onclick={() => {$officialListModal.open = true}}>{m.new_create()}</button>
        </div>

        <Infinite oninfinite={handleLoadMore}></Infinite>
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