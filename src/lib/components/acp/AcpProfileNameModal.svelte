<script lang="ts">
    import Pen from '@lucide/svelte/icons/pen';
    import { fade, fly } from 'svelte/transition';
    import {createEventDispatcher, onDestroy, onMount} from "svelte";
    import {pauseColumn} from "$lib/stores";
    const dispatch = createEventDispatcher();

  let { name = $bindable() } = $props();

    async function close() {
        dispatch('nameChange', {
            name: name,
        });
    }

    onMount(() => {
        $pauseColumn = true;
    })

    onDestroy(() => {
        $pauseColumn = false;
    })
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <div class="input-with-pen">
      <Pen size={20} color="var(--text-color-1)" />
      <input class="input-with-pen__name" bind:value={name} maxlength="30">
    </div>

    <div class="modal-close">
      <button class="button button--sm" onclick={close}>OK</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" onclick={close}></button>
</div>

<style lang="postcss">

</style>