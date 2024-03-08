<script lang="ts">
  import {_, locale} from 'svelte-i18n'
  import '../styles.css';
  import {
      agent,
      agents,
      columns,
      currentTimeline,
      globalUnique,
      isAfterReload,
      isColumnModalOpen,
      isMobileDataConnection, isReactionButtonSettingsModalOpen, keywordMutes, listAddModal, missingAccounts,
      profileStatus,
      settings, syncColumns,
      theme, direction, bluefeedAddModal
  } from '$lib/stores';
  import {goto} from '$app/navigation';
  import {dev} from '$app/environment';
  import {inject} from '@vercel/analytics';
  import {pwaInfo} from 'virtual:pwa-info';
  import {onMount} from 'svelte';
  import {Toaster} from 'svelte-french-toast';
  import viewPortSetting from '$lib/viewport';
  import {scrollDirection} from "$lib/scrollDirection";
  import Footer from "./Footer.svelte";
  import {page} from '$app/stores';
  import {liveQuery} from 'dexie';
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
  import ReactionButtonSettingsModal from "$lib/components/settings/ReactionButtonSettingsModal.svelte";
  import RealtimeListenersObserver from "$lib/components/realtime/RealtimeListenersObserver.svelte";
  import {detectDateFnsLocale} from "$lib/detectDateFnsLocale";
  import LinkWarningModal from "$lib/components/post/LinkWarningModal.svelte";
  import {isMobile} from "$lib/detectDevice";
  import WelcomeModal from "$lib/components/utils/WelcomeModal.svelte";
  import ServerStatusSticker from "$lib/components/status/ServerStatusSticker.svelte";
  import GoogleAnalytics from "$lib/components/utils/GoogleAnalytics.svelte";
  import BluefeedAddObserver from "$lib/components/list/BluefeedAddObserver.svelte";

  let loaded = false;
  let isColumnInitialLoad = false;
  let isDarkMode = false;
  let scrolly;
  let app;
  let baseColor = '#fff';
  let isRepeater = localStorage.getItem('isRepeater') === 'true';

  inject(
      {
          mode: dev ? 'development' : 'production',
          beforeSend: event => {
              if (event.url.includes('/settings') || event.url.includes('/login') || event.url.includes('/search') || event.url.includes('/shared') || event.url.includes('#post') || event.url.includes('/theme-store')) {
                  return null;
              }
              return event;
          }
      },
  );

  $: getCurrentTheme($settings.design?.skin);
  $: observeColor($theme);
  $: detectHeadThemeColor($theme);

  function detectHeadThemeColor(theme) {
      setTimeout(() => {
          baseColor = app ? getComputedStyle(app).getPropertyValue('--base-bg-color') : '#fff';
      }, 100);
  }

  function getCurrentTheme(skin) {
      const isBuiltInTheme = builtInThemes.find(_theme => _theme.name === skin);
      if (isBuiltInTheme) {
          $theme = isBuiltInTheme;
      } else {
          themesDb.themes.get(skin)
              .then(value => {
                  $theme = value;
              });
      }
  }

  function observeColor(theme) {
      if (!theme) {
          return false;
      }

      const colors = Array.isArray(theme.options?.colors) ? theme.options.colors : defaultColors;

      if (!colors.length) {
          return false;
      }

      if (!colors.some(color => color.id === $settings.design?.theme)) {
          $settings.design.theme = colors[0].id;
      }
  }

  let profiles = liveQuery(
      () => accountsDb.profiles.toArray()
  );

  $: {
      if ($profiles) {
          initProfile($profiles);
      }
  }

  async function initProfile(profiles) {
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

    checkSession(accounts);

    profileStatus.set(0);
    loaded = true;
    //isColumnInitialLoad = true;
  }

  async function checkSession(accounts) {
      let _missingAccounts = [];
      let promises = [];
      if (!accounts.length) {
          return false;
      }

      accounts.forEach(account => {
          promises = [...promises, $agents.get(account.id).agent.api.com.atproto.server.getSession()];
      });

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
          if (result.status === 'rejected') {
              console.log(result.reason);
              _missingAccounts = [..._missingAccounts, accounts[index]];
              missingAccounts.set(_missingAccounts);
          }
      })
  }

  if (!$settings.version) {
      $settings.version = 1;
  }
  console.log('settings version: ' + $settings.version || 0);

  if ($settings.version < 2) {
      $settings.design.publishPosition = 'left';
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

  // Migrate keyword mute.
  if (Array.isArray($settings?.keywordMutes)) {
      $keywordMutes = [...$settings.keywordMutes, ...$keywordMutes];
      localStorage.setItem('keywordMutes', JSON.stringify($keywordMutes));
      $settings.keywordMutes = undefined;
  }

  $: {
      localStorage.setItem('settings', JSON.stringify($settings));
      localStorage.setItem('currentTimeline', JSON.stringify($currentTimeline));
      locale.set($settings.general.language);
  }

  $: columnStorageSave($syncColumns);
  $: detectDarkMode($settings.design?.darkmode, $theme?.options.darkmodeDisabled);
  $: detectDateFnsLocale($settings.general?.language || window.navigator.language);

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if ($settings?.design.darkmode === 'prefer') {
          isDarkMode = event.matches
      }
  })

  accountsDb.profiles.get(Number(localStorage.getItem('currentProfile')))
      .then(value => {
          if (!value) {
              return false;
          }

          if (value.columns) {
              columns.set(value.columns);
              //isColumnInitialLoad = true;
          }
      });

  function columnStorageSave(columns) {
      if (!loaded) {
          return false;
      }

      const profileId = localStorage.getItem('currentProfile');
      if (!profileId) {
          return false;
      }

      const id = accountsDb.profiles.update(Number(profileId), {
          columns: columns,
      })
      localStorage.setItem('columns', JSON.stringify(columns));
  }

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
          const { registerSW } = await import('virtual:pwa-register')
          registerSW({
              immediate: true,
              onRegistered(r) {
                 r && setInterval(() => {
                     r.update();
                 }, 20000)

                  console.log(`SW Registered`)
              },
              onRegisterError(error) {
                  console.log('SW registration error', error)
              }
          })
      }

      sessionStorage.clear();
      isAfterReload.set(false);
  });

  function handleScroll(event) {
      const scroll = scrollDirection(event);

      if (scroll) {
          direction.set(scroll);
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

  viewPortSetting();
</script>

<svelte:window on:scroll={handleScroll} bind:scrollY={scrolly}></svelte:window>
<svelte:head>
  <meta name="theme-color" content={baseColor}>
</svelte:head>

<GoogleAnalytics></GoogleAnalytics>

<div
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:scrolled={scrolly > 52}
    class:sidebar={$settings.design?.publishPosition === 'left'}
    class:bottom={$settings.design?.publishPosition === 'bottom'}
    class="app scroll-{$direction} theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale} skin-{$settings?.design.skin} font-size-{$settings.design?.fontSize || 2}"
    dir="{$_('dir', {default: 'ltr'})}"
    class:compact={$settings.design?.postsLayout === 'compact'}
    class:minimum={$settings.design?.postsLayout === 'minimum'}
    class:single={$settings?.design.layout !== 'decks'}
    class:decks={$settings?.design.layout === 'decks'}
    class:page={$page.url.pathname !== '/'}
    class:ios={isMobile.iOS()}
    class:advanced-break={$settings.design?.advancedBreak}
    class:superstar={$settings.design?.reactionMode === 'superstar'}
    style={outputInlineStyle($theme)}
    bind:this={app}
>
  {#if (loaded)}
    <div class="wrap"
         class:layout-sidebar={$settings.design?.publishPosition === 'left'}>
      <Side></Side>

      <main class="main" class:layout-decks={$settings.design.layout === 'decks'}>
        {#if $settings.design.layout !== 'decks'}
          <Single></Single>
        {:else}
          <Decks></Decks>
        {/if}

        <slot />
      </main>
    </div>

    {#if $isColumnModalOpen}
      <ColumnModal on:close={handleColumnModalClose} _columns={$columns}></ColumnModal>
    {/if}

    {#if $listAddModal.open}
      <OfficialListAddObserver></OfficialListAddObserver>
    {/if}

    {#if $bluefeedAddModal.open}
      <BluefeedAddObserver></BluefeedAddObserver>
    {/if}

    {#if $isReactionButtonSettingsModalOpen}
      <ReactionButtonSettingsModal></ReactionButtonSettingsModal>
    {/if}

    {#if (!isRepeater)}
      <WelcomeModal on:close={() => isRepeater = true}></WelcomeModal>
    {/if}

    <NotificationCountObserver></NotificationCountObserver>
    <RealtimeListenersObserver></RealtimeListenersObserver>
  {:else}
    <div>

    </div>
  {/if}

  <Footer></Footer>
  <Toaster></Toaster>
  <ReportObserver></ReportObserver>
  <ProfileStatusObserver></ProfileStatusObserver>
  <LinkWarningModal></LinkWarningModal>
  <ServerStatusSticker></ServerStatusSticker>
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
      box-sizing: border-box;
  }

  .sidebar {
      .main {
          width: 100%;
          min-width: 0;
      }
  }


  .single {
      .wrap {
          width: 100%;
          max-width: 940px;
          margin: 0 auto;
          align-items: flex-start;
      }

      &.bottom {
          .wrap {
              align-items: stretch;
              max-width: 740px;
          }

          .main {
              @media (max-width: 767px) {
                  padding-top: 0;
              }
          }
      }
  }
</style>
