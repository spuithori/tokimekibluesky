<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    let hideRepost = $settings.timeline.hideRepost || false;
    let hideReply = $settings.timeline.hideReply || false;

    $: {
        $settings.timeline.hideRepost = hideRepost;
        $settings.timeline.hideReply = hideReply;

        // localStorage.setItem('settings', JSON.stringify($settings));
    }
</script>

<svelte:head>
  <title>Timeline settings - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_timeline')}</h1>
  </div>

  <div class="settings-wrap">
    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('hide_repost')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="hideRepost" bind:checked={hideRepost}><label class="input-toggle__label" for="hideRepost"></label>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('hide_reply')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="hideReply" bind:checked={hideReply}><label class="input-toggle__label" for="hideReply"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>