<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings, currentAlgorithm } from '$lib/stores';
    let disableAlgorithm = $settings?.general.disableAlgorithm || false;
    let language = $settings?.general.language || window.navigator.language;
    let dataSaver = $settings?.general.dataSaver || false;

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
    $settings.general.disableAlgorithm = disableAlgorithm;
    $settings.general.language = language;
    $settings.general.dataSaver = dataSaver;

    if ($settings.general.disableAlgorithm === 'true') {
        currentAlgorithm.set({type: 'default'});
        localStorage.setItem('currentAlgorithm', JSON.stringify({type: 'default'}));
    }
}
</script>

<svelte:head>
  <title>General - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_general')}</h1>
  </div>

  <div class="settings-wrap">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('language_settings')}
      </dt>

      <dd class="settings-group__content">
        <div class="select">
          <svg class="select__icon" xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

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
        {$_('disable_algorithm')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="disableAlgo" bind:checked={disableAlgorithm}><label class="input-toggle__label" for="disableAlgo"></label>
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
  </div>
</div>