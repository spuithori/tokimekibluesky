<script lang="ts">
  import {_, locale} from 'svelte-i18n'
  import '../styles.css';
  import { agent, agents, currentTimeline, isAfterReload, isColumnModalOpen, isMobileDataConnection, listAddModal, profileStatus, settings, theme, bluefeedAddModal, labelDefs, subscribedLabelers
  } from '$lib/stores';
  import {goto} from '$app/navigation';
  import {pwaInfo} from 'virtual:pwa-info';
  import {onMount, tick, untrack} from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import viewPortSetting from '$lib/viewport';
  import {scrollDirection} from "$lib/scrollDirection";
  import Footer from "./Footer.svelte";
  import {page} from '$app/stores';
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
  import GoogleAnalytics from "$lib/components/utils/GoogleAnalytics.svelte";
  import BluefeedAddObserver from "$lib/components/list/BluefeedAddObserver.svelte";
  import ChatUpdateObserver from "$lib/components/utils/ChatUpdateObserver.svelte";
  import {isSafariOrFirefox} from "$lib/util";
  import {initColumns} from "$lib/classes/columnState.svelte";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let loaded = $state(false);
  let isDarkMode = $state(false);
  let app = $state();
  let baseColor = $state('#fff');
  let isRepeater = $state(localStorage.getItem('isRepeater') === 'true');

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
      // $settings.design.publishPosition = 'left';
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

  if (isSafariOrFirefox()) {
      console.log('Disable WebFont in Safari and Firefox.');
      $settings.design.nonoto = true;
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if ($settings?.design.darkmode === 'prefer') {
          isDarkMode = event.matches
      }
  })

  function detectDarkMode(setting, isDarkmodeDisabled = false) {
      if (isDarkmodeDisabled) {
          isDarkMode = false;
          return false;
      }

      if (setting === true) {
          isDarkMode = true;
      } else if (setting === 'prefer') {
          isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
          isDarkMode = false;
      }
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

  function handleScroll(event) {
      if ($settings.design.layout !== 'decks') {
          const scroll = scrollDirection(event.currentTarget, 80, (scrollDir) => {
              scrollDirectionState.direction = scrollDir;
          });
      }
  }

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
  initColumns();

  $effect(() => {
      localStorage.setItem('settings', JSON.stringify($settings));
  })

  $effect(() => {
      localStorage.setItem('currentTimeline', JSON.stringify($currentTimeline));
  })

  $effect(() => {
      locale.set($settings.general?.language);
      detectDateFnsLocale($settings.general?.language);
  });

  $effect(() => {
      getCurrentTheme($settings.design?.skin);
  })

  $effect(() => {
      observeColor($theme);
      detectHeadThemeColor($theme);
  })

  $effect(() => {
      detectDarkMode($settings.design?.darkmode, $theme?.options.darkmodeDisabled);
  })
</script>

<svelte:window onscroll={handleScroll}></svelte:window>
<svelte:head>
  <meta name="theme-color" content={baseColor}>
  <link rel="canonical" href="https://tokimeki.blue{$page.url.pathname}">
</svelte:head>

<GoogleAnalytics></GoogleAnalytics>

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

      <main class="main">
        {#if $settings.design.layout !== 'decks'}
          <Single></Single>
        {:else}
          <Decks></Decks>
        {/if}

        {@render children?.()}
      </main>
    </div>

    {#if $isColumnModalOpen}
      <ColumnModal on:close={handleColumnModalClose}></ColumnModal>
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
  }

  .single {
      background-attachment: fixed;

      .wrap {
          margin: 0 auto;
      }
  }
</style>
