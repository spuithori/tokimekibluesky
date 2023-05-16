<script lang="ts">
    import {_} from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { onMount } from 'svelte';
    import { sub, unsub, isSubscribe } from '$lib/pushSubscription';
    import { agent } from '$lib/stores';
    import toast from 'svelte-french-toast'

    let isChecked = false;
    let isDisabled = false;

    async function pushToggle() {
        isDisabled = true;

        if (isChecked) {
            try {
                await sub($agent.did());
                toast.success($_('push_subscription_success'));
                isChecked = true;
            } catch (e) {
                toast.error($_('push_subscription_failed') + ' ' + e.message);
                isChecked = false;
            }
        } else {
            await unsub();
            toast.success($_('push_subscription_unsubscribe'));
        }

        isDisabled = false;
    }

    onMount(async () => {
        isChecked = await isSubscribe();
    });
</script>

<svelte:head>
  <title>Push notification - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_push_notification')}</h1>
  </div>

  <div class="settings-wrap">
    <div class="push-settings-notice">
      <h3>{$_('push_notes')}</h3>
      <p>{$_('push_text_1')}: <strong>DID</strong></p>
      <p>{$_('push_text_2')}</p>
      <p><strong class="text-danger">{$_('push_text_3')}</strong></p>
      <p>{$_('push_text_4')}</p>
      <p>{$_('push_text_5')}</p>
    </div>

    <div class="push-settings-toggle-wrap">
      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('push_toggle_switch')}
        </dt>

        <dd class="settings-group__content">
          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id="pushToggle" bind:checked={isChecked} on:change={pushToggle} disabled={isDisabled}><label class="input-toggle__label" for="pushToggle"></label>
          </div>
        </dd>
      </dl>
    </div>
  </div>
</div>

<style lang="postcss">
    .push-settings-notice {
        border: 1px solid var(--border-color-1);
        padding: 15px;
        margin: 15px 0;
    }
</style>