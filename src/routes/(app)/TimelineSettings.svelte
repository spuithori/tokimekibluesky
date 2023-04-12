<script lang="ts">
    import {_} from "svelte-i18n";
    import { clickOutside } from '$lib/clickOutSide';
    import { fade, fly } from 'svelte/transition';
    import { hideRepost, hideReply } from '$lib/stores';

    let repostToggle = JSON.parse(localStorage.getItem('hideRepost')) === true;
    let replyToggle = JSON.parse(localStorage.getItem('hideReply')) === true;
    let toggle = false;

    $: {
        localStorage.setItem('hideRepost', repostToggle ? 'true' : 'false');
        hideRepost.set(String(repostToggle));

        localStorage.setItem('hideReply', replyToggle ? 'true' : 'false');
        hideReply.set(String(replyToggle));
    }

    function settingsToggle() {
        toggle = toggle !== true;
    }
</script>

<div class="timeline-settings">
  <div class="timeline-settings-heading">
    <button class="timeline-settings-toggle" on:click={settingsToggle}>{$_('timeline_settings')}</button>
  </div>

  {#if (toggle)}
    <div class="timeline-settings-box"
         use:clickOutside={{ignoreElement: '.timeline-settings-toggle'}}
         on:outclick={() => (toggle = false)}
         transition:fly="{{ y: 30, duration: 250 }}">
      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('hide_repost')}
        </dt>

        <dd class="settings-group__content">
          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id="darkMode" bind:checked={repostToggle}><label class="input-toggle__label" for="darkMode"></label>
          </div>
        </dd>
      </dl>

      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('hide_reply')}
        </dt>

        <dd class="settings-group__content">
          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id="nonoto" bind:checked={replyToggle}><label class="input-toggle__label" for="nonoto"></label>
          </div>
        </dd>
      </dl>
    </div>
  {/if}
</div>

<style lang="postcss">
  .timeline-settings {
      position: relative;
      margin-bottom: 20px;
  }

  .timeline-settings-heading {
      text-align: right;
  }

  .timeline-settings-toggle {
      text-align: right;
      background-color: var(--bg-color-1);
      padding: 8px 16px;
      font-size: 14px;
      border-radius: 6px;
      border: 1px solid var(--primary-color);
      color: var(--text-color-2);
  }

  .timeline-settings-box {
      position: absolute;
      right: 0;
      top: calc(100% + 10px);
      background-color: var(--bg-color-1);
      box-shadow: 0 0 16px rgba(0, 0, 0, .16);
      padding: 20px;
      border-radius: 6px;
      z-index: 20;
  }
</style>