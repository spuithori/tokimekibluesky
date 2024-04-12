<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';

    if (!$settings?.embed) {
        $settings.embed = {
            x: true,
            youtube: true,
            spotify: false,
            mastodon: true,
            bluemotion: true,
            giphy: true,
        };
    }

    if ($settings?.embed?.bluemotion === undefined) {
        $settings.embed.bluemotion = true;
    }

    if ($settings?.embed?.giphy === undefined) {
        $settings.embed.giphy = true;
    }
</script>

<svelte:head>
  <title>{$_('settings_embed')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_embed')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('embed_youtube')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedYouTube" bind:checked={$settings.embed.youtube}><label class="input-toggle__label" for="embedYouTube"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('embed_x')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedX" bind:checked={$settings.embed.x}><label class="input-toggle__label" for="embedX"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('embed_spotify')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedSpotify" bind:checked={$settings.embed.spotify}><label class="input-toggle__label" for="embedSpotify"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('embed_bluemotion')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedBluemotion" bind:checked={$settings.embed.bluemotion}><label class="input-toggle__label" for="embedBluemotion"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        GIPHY
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedGiphy" bind:checked={$settings.embed.giphy}><label class="input-toggle__label" for="embedGiphy"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>

<style lang="postcss">

</style>