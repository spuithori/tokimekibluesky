<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    let hideRepost = $settings.timeline.hideRepost || 'all';
    let hideReply = $settings.timeline.hideReply || 'all';

    const replySettings = [
      {
        name: $_('reply_settings_all'),
        value: 'all',
      },
      {
        name: $_('reply_settings_following'),
        value: 'following',
      },
      {
        name: $_('reply_settings_me'),
        value: 'me',
      }
    ];

    const repostSettings = [
      {
        name: $_('repost_settings_all'),
        value: 'all',
      },
      {
        name: $_('repost_settings_many'),
        value: 'many',
      },
      {
        name: $_('repost_settings_soso'),
        value: 'soso',
      },
      {
        name: $_('repost_settings_less'),
        value: 'less',
      },
      {
        name: $_('repost_settings_none'),
        value: 'none',
      }
    ];

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
        {$_('hide_repost_frequency')}
      </dt>

      <dd class="settings-group__content">
        <div class="form-select">
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

          <select class="form-select__select" bind:value={hideRepost}>
            {#each repostSettings as option}
              <option value="{option.value}">{option.name}</option>
            {/each}
          </select>
        </div>
      </dd>
    </dl>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('hide_reply_frequency')}
      </dt>

      <dd class="settings-group__content">
        <div class="form-select">
          <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>

          <select class="form-select__select" bind:value={hideReply}>
            {#each replySettings as option}
              <option value="{option.value}">{option.name}</option>
            {/each}
          </select>
        </div>
      </dd>
    </dl>
  </div>
</div>