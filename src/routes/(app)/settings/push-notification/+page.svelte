<script lang="ts">
    import {_, locale} from 'svelte-i18n';
    import { onMount } from 'svelte';
    import { sub, unsub, isSubscribe } from '$lib/pushSubscription';
    import { toast } from 'svelte-sonner'
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import PushNotificationAccountItem from "./PushNotificationAccountItem.svelte";

    let isChecked = $state(false);
    let isDisabled = $state(false);
    let enableAccounts = $state(localStorage.getItem('pushNotificationAccounts') ? JSON.parse(localStorage.getItem('pushNotificationAccounts')) : []);

    let accounts = $derived(liveQuery(async () => {
        const accounts = await accountsDb.accounts
            .where('service')
            .equals('https://bsky.social')
            .toArray();
        return accounts;
    }))

    async function pushToggle() {
        isDisabled = true;

        if (isChecked) {
            try {
                await sub(enableAccounts, $locale);
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

    async function handleAccountEnablingChange(event) {
        if (event.detail.enabled) {
            enableAccounts = [...enableAccounts, event.detail.did];
        } else {
            enableAccounts = enableAccounts.filter(account => account !== event.detail.did);
        }

        enableAccounts = Array.from(new Set(enableAccounts));

        try {
            if (isChecked) {
                await sub(enableAccounts, $locale);
                toast.success($_('push_subscription_success'));
            }

            localStorage.setItem('pushNotificationAccounts', JSON.stringify(enableAccounts));
        } catch (e) {
            toast.error($_('push_subscription_failed') + ' ' + e.message);
            isChecked = false;
        }
    }

    onMount(async () => {
        isChecked = await isSubscribe();
    });
</script>

<svelte:head>
  <title>{$_('settings_push_notification')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_push_notification')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <div class="push-settings-notice">
      <h3>{$_('push_notes')}</h3>
      <p>{$_('push_text_1')}: <strong>DID</strong></p>
      <p>{$_('push_text_2')}</p>
      <p><strong class="text-danger">{$_('push_text_3')}</strong></p>
      <p>{$_('push_text_4')}</p>
      <p>{$_('push_text_5')}</p>
      <p>{$_('push_text_6')}</p>
    </div>

    <div class="push-settings-toggle-wrap">
      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('push_toggle_switch')}
        </dt>

        <dd class="settings-group__content">
          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id="pushToggle" bind:checked={isChecked} onchange={pushToggle} disabled={isDisabled}><label class="input-toggle__label" for="pushToggle"></label>
          </div>
        </dd>
      </dl>
    </div>

    {#if isChecked}
      {#if ($accounts)}
        <div class="push-notification-accounts-list">
          {#each $accounts as account}
            <PushNotificationAccountItem
                {account}
                isEnabled={enableAccounts.includes(account.did)}
                on:change={handleAccountEnablingChange}
            ></PushNotificationAccountItem>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style lang="postcss">
    .push-settings-notice {
        border: 1px solid var(--border-color-1);
        padding: 15px;
        margin: 15px 0;
    }

    .push-notification-accounts-list {
        margin-top: 20px;
    }
</style>