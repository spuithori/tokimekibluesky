<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { theme, nonoto, isDarkMode, currentAlgorithm, disableAlgorithm } from '$lib/stores';
    import { goto } from '$app/navigation';
    import { fade, fly } from 'svelte/transition';
    import { unsub } from '$lib/pushSubscription';
    import AccountSwitcher from './AccountSwitcher.svelte';
    import About from "./About.svelte";

    let darkModeToggle = JSON.parse(localStorage.getItem('darkmode')) === true;
    let nonotoToggle = JSON.parse(localStorage.getItem('nonoto')) === true;
    let disableAlgorithmToggle = JSON.parse(localStorage.getItem('disableAlgorithm')) === true;
    let themePick: string = localStorage.getItem('theme') || 'lightblue';
    let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
    let isAccountSwitcherOpen = false;
    let isAboutOpen = false;
    const currentAccount = Number(localStorage.getItem('currentAccount') || '0' );

    $: {
        localStorage.setItem('darkmode', darkModeToggle ? 'true' : 'false');
        isDarkMode.set(String(darkModeToggle));

        localStorage.setItem('nonoto', nonotoToggle ? 'true' : 'false');
        nonoto.set(String(nonotoToggle));

        localStorage.setItem('disableAlgorithm', disableAlgorithmToggle ? 'true' : 'false');
        disableAlgorithm.set(String(disableAlgorithmToggle));

        if ($disableAlgorithm === 'true') {
            currentAlgorithm.set({type: 'default'});
            localStorage.setItem('currentAlgorithm', $currentAlgorithm);
        }

        localStorage.setItem('theme', themePick);
        theme.set(themePick);
    }

    async function logout() {
        accounts.splice(currentAccount, 1)
        localStorage.setItem('accounts', JSON.stringify(accounts));
        await unsub();
        currentAlgorithm.set({type: 'default'});
        localStorage.setItem('currentAlgorithm', JSON.stringify({type: 'default'}));

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

    function aboutToggle() {
        isAboutOpen = isAboutOpen !== true;
    }
</script>

{#if (isAboutOpen)}
  <div class="about-box" transition:fly="{{ y: 30, duration: 250 }}">
    <button class="about-box__close" on:click={aboutToggle}></button>

    <div class="about-box__content">
      <About></About>
    </div>
  </div>
{/if}

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

<div class="settings-content">
  <div class="settings-row">
    <p class="setting-docs"><a href="https://tokimekibluesky-docs.vercel.app/" target="_blank" rel="noopener">{$_('document')}</a></p>

    <button class="settings-about" aria-label="About" on:click={aboutToggle}><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <g id="グループ_85" data-name="グループ 85" transform="translate(-1270 -935)">
        <circle id="楕円形_17" data-name="楕円形 17" cx="11" cy="11" r="11" transform="translate(1270 935)" fill="#f1f1f1"/>
        <path id="パス_16" data-name="パス 16" d="M6.212-2.813H8.22c-.233-2.163,3.159-2.427,3.159-4.715,0-2.07-1.649-3.112-3.906-3.112a5.177,5.177,0,0,0-4.015,1.9L4.734-7.559a3.3,3.3,0,0,1,2.49-1.229c1.214,0,1.961.529,1.961,1.463C9.184-5.816,5.885-5.256,6.212-2.813ZM7.224,1.326A1.315,1.315,0,0,0,8.593-.043,1.319,1.319,0,0,0,7.224-1.428,1.328,1.328,0,0,0,5.854-.043,1.315,1.315,0,0,0,7.224,1.326Z" transform="translate(1273.697 950.772)" fill="#1d1d1d"/>
      </g>
    </svg>
    </button>
  </div>

  <dl class="settings-group settings-group--column">
    <dt class="settings-group__name">
      {$_('current_account')}:
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

  <dl class="settings-group">
    <dt class="settings-group__name">
      {$_('disable_algorithm')}
    </dt>

    <dd class="settings-group__content">
      <div class="input-toggle">
        <input class="input-toggle__input" type="checkbox" id="disableAlgo" bind:checked={disableAlgorithmToggle}><label class="input-toggle__label" for="disableAlgo"></label>
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
    .settings-content {
        width: 200px;
        height: max-content;
        max-height: 85svh;
        overscroll-behavior-y: none;
        overflow: auto;
        background-color: var(--bg-color-1);
        border-radius: 8px;
        border: 1px solid var(--border-color-1);
        box-shadow: 0 0 16px rgba(0, 0, 0, .16);
        padding: 20px;
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

    .setting-docs {
    }

    .settings-row {
        border-bottom: 1px solid var(--border-color-1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10px;
    }

    .about-box {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, .6);
        z-index: 5000;
        display: grid;
        place-items: center;

        &__content {
            width: calc(100% - 20px);
            height: max-content;
            max-height: 90svh;
            max-width: 740px;
            overflow: auto;
            overscroll-behavior-y: none;
            background-color: var(--bg-color-1);
            border-radius: 6px;
            padding: 30px;
            position: relative;
        }

        &__buttons {
            text-align: center;
            margin-top: 20px;
        }

        &__close {
            position: absolute;
            left: 0;
            bottom: 0;
            right: 0;
            top: 0;
            width: 100%;
            height: 100%;
        }
    }
</style>