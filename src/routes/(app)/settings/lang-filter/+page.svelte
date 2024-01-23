<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { languageMap } from "$lib/langs/languageMap";
    let langFilter = $settings.langFilter || [];

    $: {
        $settings.langFilter = langFilter;
    }
</script>

<svelte:head>
  <title>{$_('settings_lang_filter')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_lang_filter')} ({langFilter.length})</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('lang_filter_description')}<br><strong class="text-danger">{$_('lang_filter_notice')}</strong></p>

    <div class="lang-filter-wrap">
      <div class="lang-filter-list">
        {#each languageMap as [k, v]}
          <div class="lang-filter-list__item">
            <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

            <div class="input-toggle">
              <input class="input-toggle__input" type="checkbox" id={k}
              value={k} name="Languages" bind:group={langFilter}><label class="input-toggle__label" for={k}></label>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
