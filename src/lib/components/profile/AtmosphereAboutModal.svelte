<script lang="ts">
    import {_} from "svelte-i18n";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    import Modal from "$lib/components/ui/Modal.svelte";
</script>

<Modal title="" on:close>
  <p class="text">{$_('atmosphere_description')}</p>
  <p class="text"><a href="https://atproto.com/" target="_blank" rel="noopener">🔗Atmosphere</a></p>
</Modal>

<style lang="postcss">
  .text {
      color: var(--text-color-1);
      white-space: pre-line;
  }
</style>
