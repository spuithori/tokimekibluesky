<script lang="ts">
    import {onMount} from 'svelte';
    import TenorPicker from "$lib/components/publish/TenorPicker.svelte";

    let { onclose, onpicktenor } = $props();
    let dialog = $state();

    function handleTenorClick(gif) {
        if (!gif) {
            return false;
        }

        onpicktenor(gif);
    }

    onMount(async () => {
        dialog.showModal();
    });
</script>

<dialog class="gif-modal" bind:this={dialog}>
  <div class="gif-modal-contents">
    <div class="gif-modal-heading">
      <div class="gif-modal-close">
        <div role="button" class="gif-modal-close__button" onclick={onclose}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </div>
      </div>
    </div>

    <TenorPicker onclick={handleTenorClick}></TenorPicker>
  </div>

  <button class="modal-background-close" aria-hidden="true" onclick={onclose}></button>
</dialog>

<style lang="postcss">
    .gif-modal {
        margin: auto;
        border: none;
        border-radius: var(--border-radius-3);
        overflow: hidden !important;

        &::backdrop {
            background-color: rgba(0, 0, 0, .6);
        }

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
        }
    }

    .gif-modal-contents {
        border-radius: var(--border-radius-3);
        background-color: var(--bg-color-1);
        width: 516px;
        max-width: 100%;
        position: relative;
        z-index: 2;
        color: var(--text-color-1);
        height: 600px;
        max-height: 80dvh;
        overflow-y: auto;
        padding: 0 8px;

        @media (min-width: 768px) {
            scrollbar-color: var(--primary-color) var(--bg-color-3);

            &::-webkit-scrollbar {
                width: 10px;
            }

            &::-webkit-scrollbar-thumb {
                background: var(--primary-color);
                border-radius: 5px;
            }

            &::-webkit-scrollbar-track {
                background: var(--bg-color-3);
                border-radius: 5px;
            }
        }

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .gif-modal-close {
        text-align: center;
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        right: 10px;
        top: 0;
        bottom: 0;

        &__button {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    }

    .gif-modal-heading {
        position: sticky;
        top: 0;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        background-color: var(--bg-color-1);
        z-index: 1;
        border-bottom: 1px solid var(--border-color-2);
    }
</style>