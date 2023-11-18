<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import {languageMap} from "$lib/langs/languageMap";
    let userLanguage = $settings?.general.userLanguage || window.navigator.language;
    let language = $settings?.general.language || window.navigator.language;
    let dataSaver = $settings?.general.dataSaver || false;
    let se = $settings?.general.se || false;
    let devMode = $settings?.general.devMode || false;

const languages = [
    {
        value: 'ja',
        text: '日本語'
    },
    {
        value: 'en',
        text: 'English',
    },
    {
        value: 'ko',
        text: '한국어'
    },
    {
        value: 'pt-BR',
        text: 'Português',
    }
]

$: {
    $settings.general.userLanguage = userLanguage;
    $settings.general.language = language;
    $settings.general.dataSaver = dataSaver;
    $settings.general.se = se;
    $settings.general.devMode = devMode;
}
</script>

<svelte:head>
  <title>{$_('settings_general')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_general')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('user_language_settings')}
      </dt>

      <dd class="settings-group__content">
        <div class="select">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select__icon lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select class="select__input" bind:value={userLanguage}>
            {#each languageMap as [k, v]}
              <option value="{k}">{$_(v.name)}</option>
            {/each}
          </select>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('language_settings')}
      </dt>

      <dd class="settings-group__content">
        <div class="select">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select__icon lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select class="select__input" bind:value={language}>
            {#each languages as option}
              <option value="{option.value}">{option.text}</option>
            {/each}
          </select>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('data_saver')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="dataSaver" bind:checked={dataSaver}><label class="input-toggle__label" for="dataSaver"></label>
        </div>

        <p class="settings-group__description">{$_('data_saver_description')}</p>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('dev_mode')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="devMode" bind:checked={devMode}><label class="input-toggle__label" for="devMode"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('skip_repost_confirm')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="repostConfirmSetting" bind:checked={$settings.general.repostConfirmSkip}><label class="input-toggle__label" for="repostConfirmSetting"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('skip_delete_confirm')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="deleteConfirmSetting" bind:checked={$settings.general.deleteConfirmSkip}><label class="input-toggle__label" for="deleteConfirmSetting"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('skip_link_warning_confirm')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="linkWarningConfirmSkip" bind:checked={$settings.general.linkWarningConfirmSkip}><label class="input-toggle__label" for="linkWarningConfirmSkip"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>