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
  <title>{$_('settings_timeline')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_timeline')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-smile-plus"><path d="M22 11v1a10 10 0 1 1-9-10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/><path d="M16 5h6"/><path d="M19 2v6"/></svg>
      <a href="/settings/timeline/reaction">{$_('reaction_button_settings')}<br><span>{$_('reaction_button_settings_description')}</span></a>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('hide_repost_frequency')}
      </dt>

      <dd class="settings-group__content">
        <div class="select select--fullwidth">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select__icon lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select class="select__input" bind:value={hideRepost}>
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
        <div class="select select--fullwidth">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="select__icon lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

          <select class="select__input" bind:value={hideReply}>
            {#each replySettings as option}
              <option value="{option.value}">{option.name}</option>
            {/each}
          </select>
        </div>
      </dd>
    </dl>
  </div>
</div>