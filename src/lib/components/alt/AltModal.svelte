<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import { _ } from 'svelte-i18n';
    import AltModalItem from "$lib/components/alt/AltModalItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    const dispatch = createEventDispatcher();

  let { images } = $props();

    function close() {
        dispatch('close', {
            images: images,
        });
    }
</script>

<Modal title={$_('alt_insert')} size="normal" on:close={close}>
  <div class="alt-modal-list">
    {#each images as image}
      <AltModalItem {image}></AltModalItem>
    {/each}
  </div>

  <p class="ai-note">{$_('ai_alt_note')}</p>
</Modal>

<style lang="postcss">
    .ai-note {
        font-size: 14px;
        color: var(--text-color-3);
    }
</style>