<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import {languageMap} from "$lib/langs/languageMap";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import {settingsState} from "$lib/classes/settingsState.svelte";
    import { Sparkle } from 'lucide-svelte';

    let userLanguage = $state($settings?.general.userLanguage || window.navigator.language);
    let language = $state($settings?.general.language || window.navigator.language);
    let dataSaver = $state($settings?.general.dataSaver || false);
    let disableTenorAutoplay = $state($settings?.general.disableTenorAutoplay || false);
    let se = $settings?.general.se || false;
    let devMode = $state($settings?.general.devMode || false);
    let enableBluefeed = $settings?.general.enableBluefeed || false;
    let disableHaptics = $settings?.general.disableHaptics || false;
    let enableAppBrowser = $settings?.general.enableAppBrowser || false;
    let disableChat = $settings?.general?.disableChat || false;
    let disableAtmosphere = $settings?.general?.disableAtmosphere || false;

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
    },
    {
        value: 'bg',
        text: 'български',
    },
    {
        value: 'zh-CN',
        text: '简体中文',
    },
    {
      value: 'ru',
      text: 'Русский',
    },
    {
      value: 'fr',
      text: 'Français',
    },
]

run(() => {
    $settings.general.userLanguage = userLanguage;
    $settings.general.language = language;
    $settings.general.dataSaver = dataSaver;
    $settings.general.disableTenorAutoplay = disableTenorAutoplay;
    $settings.general.se = se;
    $settings.general.devMode = devMode;
    $settings.general.enableBluefeed = enableBluefeed;
    $settings.general.disableHaptics = disableHaptics;
    $settings.general.enableAppBrowser = enableAppBrowser;
    $settings.general.disableChat = disableChat;
    $settings.general.disableAtmosphere = disableAtmosphere;
});

if (!settingsState?.settings?.translationModel) {
  settingsState.settings.translationModel = 'nmt';
}
</script>

<svelte:head>
  <title>{$_('settings_general')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_general')}
  </SettingsHeader>

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
        {$_('translation_model')}
      </dt>

      <dd class="settings-group__content">
        <div class="radio-group">
          <div class="radio radio--boxed">
            <input type="radio" bind:group={settingsState.settings.translationModel} id="translationModelNmt" name="translationModel" value={'nmt'}>
            <label for="translationModelNmt">
              <span class="radio__ui"></span>
              {$_('translation_model_nmt')}
            </label>
          </div>

          <div class="radio radio--boxed">
            <input type="radio" bind:group={settingsState.settings.translationModel} id="translationModelLlm" name="translationModel" value={'llm'}>
            <label for="translationModelLlm">
              <span class="radio__ui"></span>
              <Sparkle size="16"></Sparkle>
              {$_('translation_model_llm')}
            </label>
          </div>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('store_column_feed_data')}
        <span class="new-label">NEW</span>
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="storeColumnFeedData" bind:checked={settingsState.settings.markedUnread}><label class="input-toggle__label" for="storeColumnFeedData"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('disable_embed_via')}
        <span class="new-label">NEW</span>
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedVia" bind:checked={settingsState.settings.disableEmbedVia}><label class="input-toggle__label" for="embedVia"></label>
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
        {$_('disable_tenor_autoplay')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="disableTenorAutoplay" bind:checked={disableTenorAutoplay}><label class="input-toggle__label" for="disableTenorAutoplay"></label>
        </div>
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

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('enable_bluefeed')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="enableBluefeed" bind:checked={$settings.general.enableBluefeed}><label class="input-toggle__label" for="enableBluefeed"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('disable_atmosphere')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="disableAtmosphere" bind:checked={$settings.general.disableAtmosphere}><label class="input-toggle__label" for="disableAtmosphere"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>