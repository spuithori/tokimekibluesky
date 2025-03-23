<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
</script>

<svelte:head>
  <title>{$_('settings_embed')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_embed')}
  </SettingsHeader>

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

    <dl class="settings-group">
      <dt class="settings-group__name">
        Tenor
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="embedTenor" bind:checked={$settings.embed.tenor}><label class="input-toggle__label" for="embedTenor"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>
