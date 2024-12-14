<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { ChevronRight, SmilePlus } from "lucide-svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    let hideRepost = $state($settings.timeline.hideRepost || 'all');
    let hideReply = $state($settings.timeline.hideReply || 'all');
    let hideQuote = $state($settings.timeline.hideQuote || false);

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

    run(() => {
        $settings.timeline.hideRepost = hideRepost;
        $settings.timeline.hideReply = hideReply;
        $settings.timeline.hideQuote = hideQuote;
    });
</script>

<svelte:head>
  <title>{$_('settings_timeline')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_timeline')}
  </SettingsHeader>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <SmilePlus size="24"></SmilePlus>
      <a href="/settings/timeline/reaction">{$_('reaction_button_settings')}<br><span>{$_('reaction_button_settings_description')}</span></a>
      <ChevronRight size="20"></ChevronRight>
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

    <dl class="settings-group">
      <dt class="settings-group__name">
        {$_('hide_quote')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="hideQuote" bind:checked={hideQuote}><label class="input-toggle__label" for="hideQuote"></label>
        </div>
      </dd>
    </dl>
  </div>
</div>