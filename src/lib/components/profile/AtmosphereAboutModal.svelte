<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import Modal from "$lib/components/ui/Modal.svelte";

  let { onclose } = $props();
</script>

<Modal title="" {onclose}>
  <p class="text">{m.atmosphere_description()}</p>
  <p class="text"><a href="https://atproto.com/" target="_blank" rel="noopener">🔗Atmosphere</a></p>
</Modal>

<style lang="postcss">
  .text {
      color: var(--text-color-1);
      white-space: pre-line;
  }
</style>
