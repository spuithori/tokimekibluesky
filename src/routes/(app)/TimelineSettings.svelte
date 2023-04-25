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
    <button class="timeline-settings-toggle" on:click={settingsToggle}>
      {$_('timeline_settings')}

      {#if (repostToggle)}
        <svg xmlns="http://www.w3.org/2000/svg" width="20.239" height="16.57" viewBox="0 0 20.239 16.57">
          <g id="グループ_81" data-name="グループ 81" transform="translate(-967.88 -714.715)">
            <path id="retweet" d="M13.333,17.667A.342.342,0,0,1,13,18H3c-.385,0-.333-.406-.333-.667v-6h-2A.671.671,0,0,1,0,10.667a.638.638,0,0,1,.156-.427l3.333-4a.683.683,0,0,1,1.021,0l3.333,4A.636.636,0,0,1,8,10.667a.671.671,0,0,1-.667.667h-2v4h6a.356.356,0,0,1,.261.115l1.667,2A.42.42,0,0,1,13.333,17.667ZM20,13.333a.638.638,0,0,1-.156.427l-3.333,4a.664.664,0,0,1-1.021,0l-3.333-4A.636.636,0,0,1,12,13.333a.671.671,0,0,1,.667-.667h2v-4h-6a.332.332,0,0,1-.261-.125l-1.667-2a.357.357,0,0,1-.073-.209A.342.342,0,0,1,7,6H17c.385,0,.333.406.333.667v6h2A.671.671,0,0,1,20,13.333Z" transform="translate(968 711)" fill="var(--danger-color)"/>
            <line id="線_20" data-name="線 20" x1="19" y2="15" transform="translate(968.5 715.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
          </g>
        </svg>
      {/if}

      {#if (replyToggle)}
        <svg xmlns="http://www.w3.org/2000/svg" width="20.239" height="16.57" viewBox="0 0 20.239 16.57">
          <g id="グループ_82" data-name="グループ 82" transform="translate(-993.88 -714.715)">
            <path id="reply" d="M77,110v-2.99s0-.006,0-.01a4,4,0,0,0-4-4H70v5l-6-6,6-6v5h3a6,6,0,0,1,6,6h0v3Z" transform="translate(932 619)" fill="var(--danger-color)"/>
            <line id="線_21" data-name="線 21" x1="19" y2="15" transform="translate(994.5 715.5)" fill="none" stroke="var(--danger-color)" stroke-width="2"/>
          </g>
        </svg>
      {/if}
    </button>
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
      flex-shrink: 0;
  }

  .timeline-settings-heading {
      text-align: right;
  }

  .timeline-settings-toggle {
      text-align: center;
      background-color: var(--bg-color-1);
      padding: 8px 4px;
      font-size: 14px;
      border-radius: 6px;
      border: 1px solid var(--primary-color);
      color: var(--text-color-2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      height: 40px;
      width: 155px;
      letter-spacing: -.05em;

      svg {
          width: 16px;
          height: auto;
      }
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
      width: max-content;
  }
</style>