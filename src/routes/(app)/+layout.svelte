<script lang="ts">
  import {_, locale} from 'svelte-i18n'
  import '../styles.css';
  import { agent, agents, isAfterReload, isColumnModalOpen, isMobileDataConnection, listAddModal, profileStatus, settings, theme, bluefeedAddModal, labelDefs, subscribedLabelers } from '$lib/stores';
  import {goto} from '$app/navigation';
  import { dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import {pwaInfo} from 'virtual:pwa-info';
  import {onMount, tick, untrack} from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import viewPortSetting from '$lib/viewport';
  import Footer from "./Footer.svelte";
  import { page } from '$app/state';
  import {accountsDb, themesDb} from '$lib/db';
  import ReportObserver from "$lib/components/report/ReportObserver.svelte";
  import {resumeAccountsSession} from "$lib/resumeAccountsSession";
  import ProfileStatusObserver from "$lib/components/acp/ProfileStatusObserver.svelte";
  import Side from "./Side.svelte";
  import ColumnModal from "$lib/components/column/ColumnModal.svelte";
  import Single from "./Single.svelte";
  import Decks from "./Decks.svelte";
  import NotificationCountObserver from "$lib/components/utils/NotificationCountObserver.svelte";
  import {builtInThemes} from "$lib/builtInThemes";
  import {defaultColors} from "$lib/defaultColors";
  import OfficialListAddObserver from "$lib/components/list/OfficialListAddObserver.svelte";
  import RealtimeListenersObserver from "$lib/components/realtime/RealtimeListenersObserver.svelte";
  import {detectDateFnsLocale} from "$lib/detectDateFnsLocale";
  import LinkWarningModal from "$lib/components/post/LinkWarningModal.svelte";
  import {isMobile} from "$lib/detectDevice";
  import WelcomeModal from "$lib/components/utils/WelcomeModal.svelte";
  import BluefeedAddObserver from "$lib/components/list/BluefeedAddObserver.svelte";
  import ChatUpdateObserver from "$lib/components/utils/ChatUpdateObserver.svelte";
  import {initColumns} from "$lib/classes/columnState.svelte";
  import {on} from "svelte/events";
  import {sideState} from "$lib/classes/sideState.svelte";
  import TokBackground from "$lib/components/utils/TokBackground.svelte";
  import {setPostState} from "$lib/classes/postState.svelte";
  import {imageState} from "$lib/classes/imageState.svelte";
  import ImageModal from "$lib/components/utils/ImageModal.svelte";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/noto-sans-jp";
  import "@fontsource-variable/noto-sans-kr";
  import "@fontsource-variable/murecho";
  import "@fontsource/zen-maru-gothic";

  injectAnalytics({ mode: dev ? 'development' : 'production' });

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

  let loaded = $state(false);
  let app = $state();
  let baseColor = $state('#fff');
  let isRepeater = $state(localStorage.getItem('isRepeater') === 'true');
  let preferredDarkMode = $state(window.matchMedia('(prefers-color-scheme: dark)').matches);
  let isDarkMode = $derived.by(() => {
      if ($theme?.options?.darkmodeDisabled) {
          return false;
      }

      if ($settings?.design?.darkmode === true) {
          return true;
      } else if ($settings?.design?.darkmode === 'prefer') {
          return preferredDarkMode;
      } else {
          return false;
      }
  });

  function detectHeadThemeColor(theme) {
      tick().then(() => {
          baseColor = app ? getComputedStyle(app).getPropertyValue('--base-bg-color') : '#fff';
      })
  }

  function getCurrentTheme(skin) {
      const isBuiltInTheme = builtInThemes.find(_theme => _theme.name === skin);

      untrack(() => {
          if (isBuiltInTheme) {
              $theme = isBuiltInTheme;
          } else {
              themesDb.themes.get(skin)
                  .then(value => {
                      $theme = value;
                  });
          }
      })
  }

  function observeColor(theme) {
      if (!theme) {
          return false;
      }

      untrack(() => {
          const colors = Array.isArray(theme.options?.colors) ? theme.options.colors : defaultColors;

          if (!colors.length) {
              return false;
          }

          if (!colors.some(color => color.id === $settings.design?.theme)) {
              $settings.design.theme = colors[0].id;
          }
      });
  }

  async function initProfile() {
    const profiles = await accountsDb.profiles.toArray();
    const anyAccounts = await accountsDb.accounts
            .toArray();

    if (!anyAccounts.length) {
      console.log('Accounts are nothing');
      await goto('/login');
      return false;
    }

    if (loaded) {
        return false;
    }

    if (!profiles.length) {
        console.log('Profiles are empty. create new profile.');
        const acs = anyAccounts.map(account => account.id);
        const id = await accountsDb.profiles.put({
          accounts: acs as number[],
          columns: [],
          createdAt: '',
          name: $_('workspace') + ' 1',
          primary: acs[0] as number,
        })
        localStorage.setItem('currentProfile', id);

        await initProfile();
        return false;
    }

    const currentProfile = Number(localStorage.getItem('currentProfile'));

    if (!currentProfile) {
        console.log('Current profile is missing.');
        profileStatus.set(4);
        return false;
    }

    const profile = profiles.find(profile => profile.id === currentProfile);
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(profile.accounts)
        .toArray();
    const isPrimaryAvailable = accounts.find(account => account.id === profile.primary);

    if (!profile.accounts.length) {
        console.log('There is no account in this profile.');
        profileStatus.set(1);
        return false;
    }

    if (!accounts.length) {
        console.log('Attached accounts are missing in this profile.');
        profileStatus.set(2);
        return false;
    }

    if (!profile.primary || !isPrimaryAvailable) {
      console.log('Primary account is missing.');
      profileStatus.set(5);
      return false;
    }

    let agentsMap = await resumeAccountsSession(accounts);
    agents.set(agentsMap);
    agent.set($agents.get(profile.primary));

    try {
        $agents.forEach(_agent => {
            _agent.agent.configureLabelersHeader($subscribedLabelers);
        })

        if (!Object.keys($labelDefs).length) {
            labelDefs.set(await $agent.agent.getLabelDefinitions($subscribedLabelers));
        }

        localStorage.setItem('labelDefs', JSON.stringify($labelDefs));
    } catch (e) {
        console.error(e);
    }

    profileStatus.set(0);
    loaded = true;
  }

  if (!$settings.version) {
      $settings.version = 1;
  }
  console.log('settings version: ' + $settings.version || 0);

  if ($settings.version < 2) {
      $settings.design.skin = 'default';
      $settings.version = 2;
  }

  if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
          isMobileDataConnection.set(navigator.connection.type === 'cellular');
      })
  }

  if ($settings?.general.language) {
      locale.set($settings.general.language);
  }

  if (!$settings?.general.userLanguage) {
      $settings.general.userLanguage = window.navigator.language;
  }

  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist()
      .then(res => {
        console.log(`Storage persisted: ${res}`);
      });
  }

  onMount(async() => {
      if (pwaInfo) {
          const { registerSW } = await import('virtual:pwa-register');
          registerSW({
              immediate: true,
              onRegistered(r) {
                  console.log('SW Registered');
              },
              onRegisterError(error) {
                  console.log('SW registration error', error);
              }
          })
      }

      sessionStorage.clear();
      isAfterReload.set(false);
  });

  function handleColumnModalClose() {
    isColumnModalOpen.set(false);
  }

  function outputInlineStyle(theme) {
      if (!theme) {
          return false;
      }

      let colorStyle = '';
      let darkmodeStyle = '';

      if (theme.options?.colors) {
          const index = theme.options.colors.findIndex(color => color.id === $settings.design?.theme);

          if (index !== -1) {
              colorStyle = theme.options?.colors[index].code ? theme.options.colors[index].code : '';
          }
      }

      if (isDarkMode) {
          darkmodeStyle = theme.options?.darkmodeStyle ? theme.options.darkmodeStyle : '';
      }

      return theme.style + colorStyle + darkmodeStyle;
  }

  initProfile();
  viewPortSetting();
  setPostState();
  initColumns();

  $effect(() => {
      localStorage.setItem('settings', JSON.stringify($settings));
  });

  $effect(() => {
      locale.set($settings.general?.language);
      detectDateFnsLocale($settings.general?.language);
  });

  $effect(() => {
      getCurrentTheme($settings.design?.skin);
  });

  $effect(() => {
      observeColor($theme);
      detectHeadThemeColor($theme);
  });

  $effect(() => {
      if ($settings?.design?.darkmode === 'prefer') {
          const query = window.matchMedia('(prefers-color-scheme: dark)');

          return on(query, 'change', (e) => {
              preferredDarkMode = e.matches;
          });
      }
  });

  $effect(() => {
    const visualViewport = window.visualViewport;

    return on(visualViewport, 'resize', () => {
      document.documentElement.style.setProperty(
        "--visual-viewport-height",
        `${visualViewport.height}px`,
      );
    });
  });
</script>

<svelte:head>
  <meta name="theme-color" content={baseColor}>
  <link rel="canonical" href="https://tokimeki.blue{page.url.pathname}">
</svelte:head>

<div
    class="app theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale} skin-{$settings?.design.skin} font-size-{$settings.design?.fontSize || 2} font-theme-{$settings?.design?.fontTheme || 'default'}"
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:single={$settings?.design.layout !== 'decks'}
    class:ios={isMobile.iOS()}
    class:left-mode={$settings?.design?.leftMode}
    class:superstar={$settings.design?.reactionMode === 'superstar'}
    style={outputInlineStyle($theme)}
    dir="{$_('dir', {default: 'ltr'})}"
    bind:this={app}
>
  {#if (loaded)}
    <div class="wrap"
         class:layout-decks={$settings.design.layout === 'decks'}>
      <Side></Side>

      <main class="main main--scw-{$settings.design?.singleWidth}">
        {#if $settings.design.layout !== 'decks'}
          <Single></Single>
        {:else}
          <Decks></Decks>
        {/if}

        {@render children?.()}
      </main>
    </div>

    {#if $isColumnModalOpen}
      <ColumnModal onclose={handleColumnModalClose}></ColumnModal>
    {/if}

    {#if $listAddModal.open}
      <OfficialListAddObserver></OfficialListAddObserver>
    {/if}

    {#if $bluefeedAddModal.open}
      <BluefeedAddObserver></BluefeedAddObserver>
    {/if}

    {#if (!isRepeater)}
      <WelcomeModal on:close={() => isRepeater = true}></WelcomeModal>
    {/if}

    <NotificationCountObserver></NotificationCountObserver>
    <RealtimeListenersObserver></RealtimeListenersObserver>

    {#if !$settings?.general?.disableChat}
      <ChatUpdateObserver></ChatUpdateObserver>
    {/if}

    <Footer></Footer>
  {:else}
    <div></div>
  {/if}

  <Toaster position="top-center" theme={isDarkMode ? 'dark' : 'light'} closeButton></Toaster>
  <ReportObserver></ReportObserver>
  <ProfileStatusObserver></ProfileStatusObserver>
  <LinkWarningModal></LinkWarningModal>

  {#if sideState.isTokStart}
    <TokBackground></TokBackground>
  {/if}

  {#if imageState.images.length}
    <ImageModal></ImageModal>
  {/if}
</div>

<style lang="postcss">
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  .wrap {
      display: flex;

      @media (max-width: 767px) {
         display: block;
      }
  }

  .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;

      &--scw-xxs {
          --single-column-width: var(--single-xxs-width);
      }

      &--scw-xs {
          --single-column-width: var(--single-xs-width);
      }

      &--scw-small {
          --single-column-width: var(--single-s-width);
      }

      &--scw-medium {
          --single-column-width: var(--single-m-width);
      }

      &--scw-large {
          --single-column-width: var(--single-l-width);
      }

      &--scw-xl {
          --single-column-width: var(--single-xl-width);
      }

      &--scw-xxl {
          --single-column-width: var(--single-xxl-width);
      }
  }

  .single {
      --deck-heading-height: calc(52px + 4px);
      background-attachment: fixed;

      .wrap {
          margin: 0 auto;
      }
  }
</style>
