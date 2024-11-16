<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { languageMap } from "$lib/langs/languageMap";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    let langFilter = $state($settings.langFilter || []);

    run(() => {
        $settings.langFilter = langFilter;
    });
</script>

<svelte:head>
  <title>{$_('settings_lang_filter')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_lang_filter')} ({langFilter.length})
  </SettingsHeader>

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
