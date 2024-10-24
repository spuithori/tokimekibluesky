<script lang="ts">
    import {createEventDispatcher} from "svelte";
    import {agent} from "$lib/stores";
    import {_} from "svelte-i18n";
    import Menu from "$lib/components/ui/Menu.svelte";
    import { toast } from 'svelte-sonner';

    const dispatch = createEventDispatcher();

  let { _agent = $agent, id } = $props();

    let isMenuOpen = $state(false);

    async function deleteBookmark() {
        if (!id) {
            return false;
        }

        try {
            toast.loading($_('bookmark_deleting_process'));

            const res = await fetch(`${await _agent.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.deleteBookmark`, {
                method: 'POST',
                body: JSON.stringify({
                    bookmark: {
                        id: id,
                        owner: _agent.did() as string,
                    }
                }),
                headers: {
                    'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                    Authorization: 'Bearer ' + _agent.getToken(),
                    'Content-Type': 'application/json'
                }
            })

            toast.success($_('bookmark_delete_success'));
            dispatch('close', {
                clear: true,
                id: id,
            });
        } catch (e) {
            toast.error('Error: ' + e);
        }
    }
</script>

<div class="list-menu-wrap">
  <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="profile-menu-toggle">
    {#snippet ref()}
        <svg  xmlns="http://www.w3.org/2000/svg" width="4.5" height="18" viewBox="0 0 4.5 18">
        <path id="dots-horizontal-triple" d="M10.25,13.25A2.25,2.25,0,1,1,12.5,11,2.25,2.25,0,0,1,10.25,13.25Zm0-6.75A2.25,2.25,0,1,1,12.5,4.25,2.25,2.25,0,0,1,10.25,6.5Zm0,13.5a2.25,2.25,0,1,1,2.25-2.25A2.25,2.25,0,0,1,10.25,20Z" transform="translate(-8 -2)" fill="var(--text-color-3)"/>
      </svg>
      {/snippet}

    {#snippet content()}
        <ul  class="timeline-menu-list">
        {#if id}
          <li class="timeline-menu-list__item timeline-menu-list__item--mute">
            <button class="timeline-menu-list__button" onclick={deleteBookmark}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              <span class="text-danger">{$_('delete_bookmark')}</span>
            </button>
          </li>
        {/if}
      </ul>
      {/snippet}
  </Menu>
</div>

<style lang="postcss">
    .list-menu-wrap {
        position: absolute;
        right: 16px;
        top: 16px;
    }
</style>