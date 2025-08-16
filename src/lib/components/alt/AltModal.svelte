<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import AltModalItem from "$lib/components/alt/AltModalItem.svelte";
  import Modal from "$lib/components/ui/Modal.svelte";

  let { images, close, altFocusPulse } = $props();
</script>

<Modal title={m.alt_insert()} size="normal" onclose={() => {close(images)}}>
  <div class="alt-modal-list">
    {#each images as image}
      <AltModalItem {image} {altFocusPulse}></AltModalItem>
    {/each}
  </div>

  <p class="ai-note">{m.ai_alt_note()}</p>
</Modal>

<style lang="postcss">
    .ai-note {
        font-size: 14px;
        color: var(--text-color-3);
    }
</style>