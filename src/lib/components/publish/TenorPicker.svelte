<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import TenorGrid from "$lib/components/publish/TenorGrid.svelte";

    let { onclick } = $props();
    let dialog;
    let term = $state('');

    function handleClick(gif) {
        if (!gif) {
            return false;
        }

        onclick(gif);
    }
</script>

<div class="gif-modal-content">
  <div class="gif-modal-search">
    <input type="text" class="gif-modal-search__input" placeholder={m.tenor_picker_placeholder()} bind:value={term}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  </div>

  <div class="gif-picker">
    {#key term}
      <TenorGrid
              category={term ? 'search' : 'featured'}
              term={term}
              onclick={handleClick}
      ></TenorGrid>
    {/key}
  </div>
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

    .gif-picker {

    }
</style>