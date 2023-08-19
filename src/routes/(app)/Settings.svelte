<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {columns, singleColumn} from '$lib/stores';
    import { goto } from '$app/navigation';
    import { fade, fly } from 'svelte/transition';
    import { unsub } from '$lib/pushSubscription';
    import AccountSwitcher from './AccountSwitcher.svelte';
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

    let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    let isAccountSwitcherOpen = false;
    const currentAccount = Number(localStorage.getItem('currentAccount') || '0' );

    async function logout() {
        accounts.splice(currentAccount, 1)
        localStorage.setItem('accounts', JSON.stringify(accounts));
        await unsub();
        localStorage.removeItem('follows');

        $columns = [];
        $singleColumn = {
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default'
        }

        if (accounts.length > 0) {
            localStorage.setItem('currentAccount', String(Number(accounts.length - 1)));
            location.reload();
        } else {
            goto('/login');
        }
    }

    async function addAccount() {
        const setAccount = accounts.length;
        localStorage.setItem('currentAccount', String(setAccount));

        $columns = [];
        $singleColumn = {
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default'
        }

        goto('/login');
    }

    function accountSwitcherToggle() {
        accounts = accounts;
        isAccountSwitcherOpen = isAccountSwitcherOpen !== true;
    }

    function close() {
        dispatch('close');
    }
</script>

{#if (isAccountSwitcherOpen)}
  <div class="account-switcher-box" transition:fly="{{ y: 30, duration: 250 }}">
    <div class="account-switcher-box__content">
      <AccountSwitcher {accounts} {currentAccount}></AccountSwitcher>

      <div class="account-switcher-box__buttons">
        <button class="button" on:click={accountSwitcherToggle}>{$_('close_button')}</button>
      </div>
    </div>
  </div>
{/if}

<div class="timeline-menu timeline-menu--settings timeline-menu--shown">
  <ul class="timeline-menu-list">
    <li class="timeline-menu-list__item">
      <a class="timeline-menu-list__button" href="/settings" on:click={close}>
        <span class="">{$_('settings')}</span>
      </a>
    </li>

    <li class="timeline-menu-list__item">
      <a class="timeline-menu-list__button" href="/settings/profiles" on:click={close}>
        <span class="">{$_('settings_profiles')}</span>
      </a>
    </li>

    <li class="timeline-menu-list__item">
      <a class="timeline-menu-list__button" href="/settings/timeline" on:click={close}>
        <span class="">{$_('timeline_settings')}</span>
      </a>
    </li>

    <!--
    <li class="timeline-menu-list__item">
      <button class="timeline-menu-list__button" type="submit" name="switch_account" on:click={accountSwitcherToggle}>
        <span class="">{$_('switch_account')}</span>
      </button>
    </li>

    <li class="timeline-menu-list__item">
      <button class="timeline-menu-list__button" type="submit" name="add_account" on:click={addAccount}>
        <span class="">{$_('add_account')}</span>
      </button>
    </li> -->

    <li class="timeline-menu-list__item">
      <a class="timeline-menu-list__button" href="/settings/about" on:click={close}>
        <span class="">{$_('settings_about')}</span>
      </a>
    </li>

    <!--
    <li class="timeline-menu-list__item">
      <button class="timeline-menu-list__button" type="submit" name="logout" on:click={logout}>
        <span class="text-danger">{$_('logout_button')}</span>
      </button>
    </li> -->
  </ul>
</div>

<style lang="postcss">
    .account-switcher-box {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, .6);
        z-index: 101;
        display: grid;
        place-items: center;

        &__content {
            width: max-content;
            height: max-content;
            max-height: 90svh;
            max-width: calc(100% - 20px);
            overflow: auto;
            overscroll-behavior-y: none;
            background-color: var(--bg-color-1);
            border-radius: 6px;
            padding: 30px;
        }

        &__buttons {
            text-align: center;
            margin-top: 20px;
        }
    }
</style>