<script lang="ts">
    import { onMount } from 'svelte';
    import { sub, unsub, isSubscribe } from '$lib/pushSubscription';
    import { toast } from 'svelte-sonner'
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import PushNotificationAccountItem from "./PushNotificationAccountItem.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import { m } from "$lib/paraglide/messages.js";
    import {getLocale} from "$lib/paraglide/runtime";

    let isChecked = $state(false);
    let isDisabled = $state(false);
    let enableAccounts = $state(localStorage.getItem('pushNotificationAccounts') ? JSON.parse(localStorage.getItem('pushNotificationAccounts')) : []);
    let notifications = $state(localStorage.getItem('pushNotificationNotifications') ? JSON.parse(localStorage.getItem('pushNotificationNotifications')) : []);

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
                await sub(enableAccounts, getLocale(), notifications);
                toast.success(m.push_subscription_success());
                isChecked = true;
            } catch (e) {
                toast.error(m.push_subscription_failed() + ' ' + e.message);
                isChecked = false;
            }
        } else {
            await unsub();
            toast.success(m.push_subscription_unsubscribe());
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
                await sub(enableAccounts, getLocale(), notifications);
                toast.success(m.push_subscription_success());
            }

            localStorage.setItem('pushNotificationAccounts', JSON.stringify(enableAccounts));
        } catch (e) {
            toast.error(m.push_subscription_failed() + ' ' + e.message);
            isChecked = false;
        }
    }

    onMount(async () => {
        isChecked = await isSubscribe();
    });
</script>

<svelte:head>
  <title>{m.settings_push_notification()} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {m.settings_push_notification()}
  </SettingsHeader>

  <div class="settings-wrap">
    <div class="push-settings-notice">
      <h3>{m.push_notes()}</h3>
      <p>{m.push_text_1()}: <strong>DID</strong></p>
      <p>{m.push_text_2()}</p>
      <p><strong class="text-danger">{m.push_text_3()}</strong></p>
      <p>{m.push_text_4()}</p>
      <p>{m.push_text_5()}</p>
      <p>{m.push_text_6()}</p>
    </div>

    <div class="push-settings-toggle-wrap">
      <dl class="settings-group">
        <dt class="settings-group__name">
          {m.push_toggle_switch()}
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