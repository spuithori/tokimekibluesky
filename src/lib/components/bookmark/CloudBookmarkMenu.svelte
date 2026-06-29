<script lang="ts">
    import Trash2 from '@lucide/svelte/icons/trash-2';
  import {agent} from "$lib/stores";
  import {_} from "svelte-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { toast } from 'svelte-sonner';

  let { _agent = $agent, id, close } = $props();

  let isMenuOpen = $state(false);

  async function deleteBookmark() {
      if (!id) {
          return false;
      }

      try {
          toast.loading($_('bookmark_deleting_process'));

          await _agent.deleteCloudBookmark(id);

          toast.success($_('bookmark_delete_success'));
          close(true, id);
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
              <Trash2 color="var(--danger-color)" />
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
        left: 16px;
        top: 12px;
        z-index: 22;
    }
</style>