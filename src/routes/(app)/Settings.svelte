<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { theme, nonoto, isDarkMode } from '$lib/stores';
    import { goto } from '$app/navigation';
    import { fade, fly } from 'svelte/transition';
    import AccountSwitcher from './AccountSwitcher.svelte';

    let darkModeToggle = JSON.parse(localStorage.getItem('darkmode')) === true;
    let nonotoToggle = JSON.parse(localStorage.getItem('nonoto')) === true;
    let themePick = localStorage.getItem('theme');
    let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    let isAccountSwitcherOpen = false;
    const currentAccount = Number(localStorage.getItem('currentAccount') || '0' );

    $: {
        localStorage.setItem('darkmode', darkModeToggle ? 'true' : 'false');
        isDarkMode.set(String(darkModeToggle));

        localStorage.setItem('nonoto', nonotoToggle ? 'true' : 'false');
        nonoto.set(String(nonotoToggle));

        localStorage.setItem('theme', themePick);
        theme.set(themePick);
    }

    async function logout() {
        accounts.splice(currentAccount, 1)
        localStorage.setItem('accounts', JSON.stringify(accounts));

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
        goto('/login');
    }

    function accountSwitcherToggle() {
        accounts = accounts;
        isAccountSwitcherOpen = isAccountSwitcherOpen !== true;
    }
</script>

<div>
  <dl class="settings-group settings-group--column">
    <dt class="settings-group__name">
      現在のアカウント:
    </dt>

    <dd class="settings-group__content">
      <strong class="primary-color">{accounts[currentAccount].name}</strong><br>
      {accounts[currentAccount].service}
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('darkmode')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id="darkMode" bind:checked={darkModeToggle}><label class="input-toggle__label" for="darkMode"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('do_not_use_noto_sans')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id="nonoto" bind:checked={nonotoToggle}><label class="input-toggle__label" for="nonoto"></label>
      </div>
    </dd>
  </dl>

  <dl class="settings-group settings-group--column">
    <dt class="settings-group__name">
      {$_('theme')}
    </dt>

    <dd class="settings-group__content">
      <ul class="theme-picker theme-picker--{themePick}">
        <li class="theme-picker__item theme-picker__item--lightpink">
          <button class="theme-picker__button" on:click={() => {themePick = 'lightpink'}} aria-label="ライトピンク"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--pastelyellow">
          <button class="theme-picker__button" on:click={() => {themePick = 'pastelyellow'}} aria-label="パステルイエロー"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--lightblue">
          <button class="theme-picker__button" on:click={() => {themePick = 'lightblue'}} aria-label="ライトブルー"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--royalblue">
          <button class="theme-picker__button" on:click={() => {themePick = 'royalblue'}} aria-label="ロイヤルブルー"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--superorange">
          <button class="theme-picker__button" on:click={() => {themePick = 'superorange'}} aria-label="超オレンジ"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--violet">
          <button class="theme-picker__button" on:click={() => {themePick = 'violet'}} aria-label="すみれ"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--scarlet">
          <button class="theme-picker__button" on:click={() => {themePick = 'scarlet'}} aria-label="スカーレット"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--lightgreen">
          <button class="theme-picker__button" on:click={() => {themePick = 'lightgreen'}} aria-label="ライトグリーン"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--paperwhite">
          <button class="theme-picker__button" on:click={() => {themePick = 'paperwhite'}} aria-label="ペーパーホワイト"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--jade">
          <button class="theme-picker__button" on:click={() => {themePick = 'jade'}} aria-label="翡翠"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--platinumsilver">
          <button class="theme-picker__button" on:click={() => {themePick = 'platinumsilver'}} aria-label="プラチナシルバー"></button>
        </li>

        <li class="theme-picker__item theme-picker__item--pinkgold">
          <button class="theme-picker__button" on:click={() => {themePick = 'pinkgold'}} aria-label="ピンクゴールド"></button>
        </li>
      </ul>
    </dd>
  </dl>

  <div class="account-switcher">
    <div class="account-switcher-toggle">
      <button class="button button--logout button--sm button--border button--white" type="submit" name="add_account" on:click={accountSwitcherToggle}>{$_('switch_account')}</button>

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
    </div>

  </div>

  <div class="other-account">
    <button class="button button--logout button--sm button--border button--white" type="submit" name="add_account" on:click={addAccount}>{$_('add_account')}</button>
  </div>

  <div class="logout">
    <button class="button button--logout button--sm button--border button--white button--danger" type="submit" name="logout" on:click={logout}>{$_('logout_button')}</button>
  </div>
</div>

<style lang="postcss">
    input[type=checkbox]{
        display: block;
        height: 0;
        width: 0;
        visibility: hidden;
    }

    .input-toggle__label {
        position: relative;
        text-indent: -9999px;
        width: 50px;
        height: 30px;
        background: var(--border-color-1);
        display: block;
        border-radius: 15px;
        cursor: pointer;
    }

    .input-toggle__label:after {
        content: '';
        position: absolute;
        top: 5px;
        left: 5px;
        width: 20px;
        height: 20px;
        background: var(--bg-color-1);
        border-radius: 50%;
        transition: all 0.25s ease-in-out;
    }

    .input-toggle__input:checked + .input-toggle__label {
        background: var(--primary-color);
    }

    .input-toggle__input:checked + .input-toggle__label:after {
        left: calc(100% - 5px);
        transform: translateX(-100%);
    }

    .input-toggle__label:active:after {
        width: 20px;
    }

    .settings-group {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        gap: 10px;
        font-size: 14px;
        border-bottom: 1px solid var(--border-color-1);

        &--column {
          display: block;
       }
    }

    .settings-group:first-child {
        border-top: 1px solid var(--border-color-1);
    }

    .theme-picker {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        list-style: none;
        margin-top: 10px;

        &--lightpink {
            .theme-picker__item--lightpink button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--pastelyellow {
            .theme-picker__item--pastelyellow button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--lightblue {
            .theme-picker__item--lightblue button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--royalblue {
            .theme-picker__item--royalblue button {
                border: 2px solid var(--text-color-3);
            }
        }

        &--superorange {
            .theme-picker__item--superorange button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--violet {
            .theme-picker__item--violet button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--scarlet {
            .theme-picker__item--scarlet button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--lightgreen {
            .theme-picker__item--lightgreen button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--paperwhite {
            .theme-picker__item--paperwhite button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--jade {
            .theme-picker__item--jade button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--platinumsilver {
            .theme-picker__item--platinumsilver button {
                border: 2px solid var(--text-color-1);
            }
        }

        &--pinkgold {
            .theme-picker__item--pinkgold button {
                border: 2px solid var(--text-color-1);
            }
        }

        &__item {
            aspect-ratio: 1 / 1;
            border-radius: var(--primary-color);

            &--lightpink {
                button {
                    background-color: var(--color-theme-1);
                }
            }

            &--pastelyellow {
                button {
                    background-color: var(--color-theme-2);
                }
            }

            &--lightblue {
                button {
                    background-color: var(--color-theme-3);
                }
            }

            &--royalblue {
                button {
                    background-color: var(--color-theme-4);
                }
            }

            &--superorange {
                button {
                    background-color: var(--color-theme-5);
                }
            }

            &--violet {
                button {
                    background-color: var(--color-theme-6);
                }
            }

            &--scarlet {
                button {
                    background-color: var(--color-theme-7);
                }
            }

            &--lightgreen {
                button {
                    background-color: var(--color-theme-8);
                }
            }

            &--paperwhite {
                button {
                    background-color: var(--color-theme-9);
                    border: 2px solid var(--border-color-1);
                }
            }

            &--jade {
                button {
                    background-color: var(--color-theme-10);
                }
            }

            &--platinumsilver {
                button {
                    background-color: var(--color-theme-11);
                }
            }

            &--pinkgold {
                button {
                    background-color: var(--color-theme-12);
                }
            }
        }

        &__button {
            width: 100%;
            height: 100%;
            border-radius: 4px;
        }
    }

    .logout {
        margin-top: 20px;
    }



    .account-switcher-box {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, .6);
        z-index: 1000;
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

    .account-switcher {
        margin-top: 20px;
        margin-bottom: 10px;

        @media (max-width: 767px) {
            .button {
                width: 100%;
            }
        }
    }
</style>