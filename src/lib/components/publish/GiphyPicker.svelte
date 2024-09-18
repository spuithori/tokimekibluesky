<script lang="ts">
    import {createEventDispatcher} from 'svelte';
    import { _ } from 'svelte-i18n';
    import { GiphyFetch } from '@giphy/js-fetch-api';
    import { PUBLIC_GIPHY_API_KEY } from '$env/static/public';
    import { Grid } from '@giphy/svelte-components';
    const dispatch = createEventDispatcher();

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

        dispatch('click', {
            gif: e.detail.gif,
        });
    }
</script>

<svelte:window bind:innerWidth></svelte:window>

<div class="gif-modal-content">
  <div class="gif-modal-search">
    <input type="text" class="gif-modal-search__input" placeholder={$_('giphy_picker_placeholder')} bind:value={term}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
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

<style lang="postcss">
    .gif-modal-search {
        position: relative;
        width: 262px;
        margin: 0 auto 16px;

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