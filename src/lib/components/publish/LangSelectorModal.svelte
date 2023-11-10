<script lang="ts">
    import { settings } from '$lib/stores';
    import {createEventDispatcher, onMount} from 'svelte';
    import { _ } from 'svelte-i18n';
    import {languageMap} from "$lib/langs/languageMap";
    const dispatch = createEventDispatcher();

    let langSelector = $settings.langSelector || [];
    let dialog;

    $: {
        $settings.langSelector = langSelector;
    }

    async function close () {
        dispatch('close');
    }

    onMount(() => {
        dialog.showModal();
    });
</script>

<dialog class="lang-selector-modal" bind:this={dialog}>
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
      <div role="button" class="button button--sm button--border" on:click={close}>{$_('close_button')}</div>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</dialog>

<style lang="postcss">
    .lang-selector-modal {
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

    .lang-selector-modal-contents {
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

    .lang-selector-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>