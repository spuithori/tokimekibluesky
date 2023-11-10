<script lang="ts">
    import { fly } from 'svelte/transition';
    import {createEventDispatcher, onMount} from 'svelte';
    import { _ } from 'svelte-i18n';
    import AltModalItem from "$lib/components/alt/AltModalItem.svelte";
    const dispatch = createEventDispatcher();

    export let images;
    let dialog;

    function close() {
        dispatch('close', {
            images: images,
        });
    }

    onMount(() => {
        dialog.showModal();
    });
</script>

<dialog class="alt-modal" bind:this={dialog}>
  <div class="alt-modal-contents">
    <h2 class="alt-modal-title">{$_('alt_insert')}</h2>

    <div class="alt-modal-list">
      {#each images as image}
        <AltModalItem {image}></AltModalItem>
      {/each}
    </div>

    <p class="ai-note">{$_('ai_alt_note')}</p>

    <div class="alt-modal-close">
      <button class="button button--sm" on:click={close}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</dialog>

<style lang="postcss">
    .alt-modal {
        margin: auto;
        overflow: auto;
        border: none;
        border-radius: var(--border-radius-3);

        &::backdrop {
            background-color: rgba(0, 0, 0, .6);
        }

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
        }
    }

    .alt-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;
        color: var(--text-color-1);

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .alt-modal-close {
        text-align: center;
        margin-top: 30px;
    }

    .alt-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 10px;
    }

    .ai-note {
        font-size: 14px;
        color: var(--text-color-3);
    }
</style>