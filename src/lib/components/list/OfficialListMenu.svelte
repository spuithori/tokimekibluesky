<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {agent} from "$lib/stores";
    import {_} from "svelte-i18n";
    import Menu from "$lib/components/ui/Menu.svelte";

    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let uri;
    export let existingUris = [];

    let isMenuOpen = false;

    async function deleteList() {
        if (!uri) {
            return false;
        }

        try {
            let writes = [{
                $type: 'com.atproto.repo.applyWrites#delete',
                collection: 'app.bsky.graph.list',
                rkey: uri.split('/').slice(-1)[0],
            }];

            if (existingUris.length) {
                existingUris.forEach(uri => {
                    writes = [...writes, {
                        $type: 'com.atproto.repo.applyWrites#delete',
                        collection: 'app.bsky.graph.listitem',
                        rkey: uri.split('/').slice(-1)[0],
                    }]
                })
            }

            const res = await _agent.agent.com.atproto.repo.applyWrites({
                repo: _agent.did() as string,
                writes: writes,
            });

            dispatch('close');
        } catch (e) {
            console.error(e)
        }
    }
</script>

<div class="list-menu-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
    <svg slot="ref" xmlns="http://www.w3.org/2000/svg" width="4.5" height="18" viewBox="0 0 4.5 18">
      <path id="dots-horizontal-triple" d="M10.25,13.25A2.25,2.25,0,1,1,12.5,11,2.25,2.25,0,0,1,10.25,13.25Zm0-6.75A2.25,2.25,0,1,1,12.5,4.25,2.25,2.25,0,0,1,10.25,6.5Zm0,13.5a2.25,2.25,0,1,1,2.25-2.25A2.25,2.25,0,0,1,10.25,20Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
    </svg>

    <ul slot="content" class="timeline-menu-list">
      {#if uri}
        <li class="timeline-menu-list__item timeline-menu-list__item--mute">
          <button class="timeline-menu-list__button" on:click={deleteList}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            <span class="text-danger">{$_('delete_list')}</span>
          </button>
        </li>
      {/if}
    </ul>
  </Menu>
</div>

<style lang="postcss">
  .list-menu-wrap {
      position: absolute;
      right: 16px;
      top: 16px;
  }
</style>