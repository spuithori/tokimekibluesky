<script lang="ts">
    import {_} from "svelte-i18n";
    import { fade, fly } from 'svelte/transition';
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let name;

    async function close() {
        dispatch('nameChange', {
            name: name,
        });
    }
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <div class="input-with-pen">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      <input class="input-with-pen__name" bind:value={name} maxlength="30">
    </div>

    <div class="modal-close">
      <button class="button button--sm" on:click={close}>OK</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</div>

<style lang="postcss">

</style>