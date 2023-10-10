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
      isMobileDataConnection, isReactionButtonSettingsModalOpen, listAddModal, missingAccounts,
      profileStatus,
      settings, syncColumns,
      theme
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

  let loaded = false;
  let isColumnInitialLoad = false;
  let isDarkMode = false;
  let direction = 'up';
  let scrolly;

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
          createdAt: "",
          name: "New Profile",
          primary: acs[0] as number,
        })
      localStorage.setItem('currentProfile', id);
    }

    const currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
    const profile = profiles.find(profile => profile.id === currentProfile);
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(profile.accounts)
        .toArray();

    if (!accounts && !profile) {
        console.log('Account is empty in this profile.');
        loaded = true;
        return false;
    }

    if (!profile.accounts.length) {
        console.log('There is no account in this profile.');
        profileStatus.set(1);
        loaded = true;
        return false;
    }

    if (!accounts.length) {
        console.log('Attached accounts are missing in this profile');
        profileStatus.set(2);
        loaded = true;
        return  false;
    }

    let agentsMap = await resumeAccountsSession(accounts);
    let pid;

    if (!profile.primary) {
        try {
            pid = await accountsDb.profiles.update(profile.id, {
                primary: accounts[0].id,
            });
        } catch (e) {
            console.error(e);
        }
    }

    agents.set(agentsMap);
    agent.set($agents.get(profile.primary || accounts[0].id));

    checkSession(accounts);

    loaded = true;
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

  function handleReload() {
      loaded = false;
  }

  accountsDb.profiles.get(Number(localStorage.getItem('currentProfile')))
      .then(value => {
          if (!value) {
              return false;
          }

          if (value.columns) {
              columns.set(value.columns);
              isColumnInitialLoad = true;
          }
      });

  function columnStorageSave(columns) {
      if (!isColumnInitialLoad) {
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
          direction = scroll;
      }
  }

  function handleColumnModalClose(event) {
      $columns = event.detail.columns;

      if (event.detail.isClose) {
          isColumnModalOpen.set(false);
          globalUnique.set(Symbol());
      }
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

<svelte:window on:scroll={handleScroll} bind:scrollY={scrolly} />

<div
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:scrolled={scrolly > 52}
    class:sidebar={$settings.design?.publishPosition === 'left'}
    class:bottom={$settings.design?.publishPosition === 'bottom'}
    class="app scroll-{direction} theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale} skin-{$settings?.design.skin} font-size-{$settings.design?.fontSize || 2}"
    dir="{$_('dir', {default: 'ltr'})}"
    class:compact={$settings.design?.postsLayout === 'compact'}
    class:minimum={$settings.design?.postsLayout === 'minimum'}
    class:single={$settings?.design.layout !== 'decks'}
    class:decks={$settings?.design.layout === 'decks'}
    class:page={$page.url.pathname !== '/'}
    style={outputInlineStyle($theme)}
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

    {#if $isReactionButtonSettingsModalOpen}
      <ReactionButtonSettingsModal></ReactionButtonSettingsModal>
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

  main {
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
