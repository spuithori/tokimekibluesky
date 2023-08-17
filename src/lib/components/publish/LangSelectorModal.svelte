<script lang="ts">
    import { settings } from '$lib/stores';
    import {createEventDispatcher} from 'svelte';
    import { _ } from 'svelte-i18n';
    import {languageMap} from "$lib/langs/languageMap";
    const dispatch = createEventDispatcher();

    let langSelector = $settings.langSelector || [];

    $: {
        $settings.langSelector = langSelector;
    }

    async function close () {
        dispatch('close');
    }
</script>

<div class="lang-selector-modal">
  <div class="lang-selector-modal-contents">
    <div class="lang-filter-list">
      <div class="lang-filter-list__item">
        <p class="lang-filter-list__name"><label for="auto">{$_('lang_selector_auto')}</label></p>

        <div class="input-toggle">
          <input class="input-toggle__input" type="radio" id="auto"
                 value="auto" name="Languages" bind:group={langSelector}><label class="input-toggle__label" for="auto"></label>
        </div>
      </div>

      {#each languageMap as [k, v]}
        <div class="lang-filter-list__item">
          <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

          <div class="input-toggle">
            <input class="input-toggle__input" type="radio" id={k}
                   value={k} name="Languages" bind:group={langSelector}><label class="input-toggle__label" for={k}></label>
          </div>
        </div>
      {/each}
    </div>

    <div class="lang-selector-modal-close">
      <button class="button button--sm button--border" on:click={close}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</div>

<style lang="postcss">
    .lang-selector-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .lang-selector-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .lang-selector-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 26px;
    }

    .lang-selector-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>