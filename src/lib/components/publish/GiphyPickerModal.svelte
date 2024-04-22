<script lang="ts">
    import {agent} from '$lib/stores';
    import {createEventDispatcher, onMount} from 'svelte';
    import { _ } from 'svelte-i18n';
    import { GiphyFetch } from '@giphy/js-fetch-api';
    import { PUBLIC_GIPHY_API_KEY } from '$env/static/public';
    import { Grid } from '@giphy/svelte-components';
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    let dialog;
    const gf = new GiphyFetch(PUBLIC_GIPHY_API_KEY);
    let offset = 0;
    let term = '';
    let innerWidth;

    function close () {
        dispatch('close');
    }

    function fetchGifs(offset) {
        if (!gf) {
            return false;
        }

        if (!term) {
            return gf.trending({ offset, limit: 10 });
        }

        return gf.search(term, { offset, limit: 10 });
    }

    function handleClick(e) {
        if (!e.detail.gif) {
            return false;
        }

        dispatch('pickgif', {
            gif: e.detail.gif,
        });
    }

    onMount(async () => {
        dialog.showModal();
    });
</script>

<svelte:window bind:innerWidth></svelte:window>

<dialog class="giphy-modal" bind:this={dialog}>
  <div class="giphy-modal-contents">
    <div class="giphy-modal-heading">
      <div class="giphy-modal-close">
        <div role="button" class="giphy-modal-close__button" on:click={close}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </div>
      </div>

      <div class="giphy-modal-search">
        <input type="text" class="giphy-modal-search__input" placeholder={$_('giphy_picker_placeholder')} bind:value={term}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      </div>
    </div>

    {#if (innerWidth)}
      <div class="giphy-picker">
        {#key term}
          <Grid
              width={innerWidth > 552 ? 484 : innerWidth - 52}
              columns={2}
              fetchGifs={fetchGifs}
              on:click={handleClick}
          ></Grid>
        {/key}
      </div>
    {/if}
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</dialog>

<style lang="postcss">
    .giphy-modal {
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

    .giphy-modal-contents {
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

    .giphy-modal-close {
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

    .giphy-modal-heading {
        position: sticky;
        top: 0;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
        background-color: var(--bg-color-1);
        z-index: 1;
    }

    .giphy-modal-search {
        position: relative;

        &__input {
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            height: 40px;
            border-radius: 20px;
            padding: 0 40px 0 20px;
            color: var(--text-color-1);

            &:placeholder-shown {
                color: var(--text-color-3);
            }

            @media (max-width: 767px) {
                width: 200px;
            }
        }

        svg {
            position: absolute;
            right: 16px;
            top: 0;
            bottom: 0;
            margin: auto;
            pointer-events: none;
        }
    }

    .giphy-picker {

    }
</style>