<script lang="ts">
  import {_, locale} from 'svelte-i18n'
  import '../styles.css';
  import { isColumnModalOpen, isMobileDataConnection, listAddModal, settings, theme, bluefeedAddModal } from '$lib/stores';
  import { dev } from '$app/environment';
  import { injectAnalytics } from '@vercel/analytics/sveltekit';
  import {tick, untrack} from 'svelte';
  import { Toaster } from 'svelte-sonner';
  import viewPortSetting from '$lib/viewport';
  import Footer from "./Footer.svelte";
  import { page } from '$app/state';
  import {themesDb} from '$lib/db';
  import ReportObserver from "$lib/components/report/ReportObserver.svelte";
  import ProfileStatusObserver from "$lib/components/acp/ProfileStatusObserver.svelte";
  import Side from "./Side.svelte";
  import ColumnModal from "$lib/components/column/ColumnModal.svelte";
  import Single from "./Single.svelte";
  import Decks from "./Decks.svelte";
  import NotificationCountObserver from "$lib/components/utils/NotificationCountObserver.svelte";
  import {builtInThemes, oldThemeConvert} from "$lib/builtInThemes";
  import {defaultColors} from "$lib/defaultColors";
  import OfficialListAddObserver from "$lib/components/list/OfficialListAddObserver.svelte";
  import RealtimeListenersObserver from "$lib/components/realtime/RealtimeListenersObserver.svelte";
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
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {appState} from "$lib/classes/appState.svelte";

  injectAnalytics({
    mode: dev ? 'development' : 'production',
    beforeSend(event) {
      if (event.url === 'https://tokimeki.blue/' || event.url === 'https://tokimekibluesky.vercel.app/') {
        return event;
      }
      return null;
    }
  });

  interface Props {
    children?: import('svelte').Snippet;
  }
  let { children }: Props = $props();

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

  if ($settings?.general?.language) {
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

  if ($settings?.design?.skin === 'default' || $settings?.design?.skin === 'twilight') {
    const convertedTheme = oldThemeConvert($settings?.design?.theme);
    if (convertedTheme) {
      $settings.design.theme = convertedTheme;
    }
  }

  if ($settings?.design?.skin === 'twilight') {
    $settings.design.skin = 'default';
    $settings.design.darkmode = true;
  }

  function handleColumnModalClose() {
    isColumnModalOpen.set(false);
  }

  function outputInlineStyle(theme) {
      if (!theme) {
          return false;
      }

      let colorStyle = '';
      let bubbleStyle = '';
      let darkmodeStyle = '';

      if (theme.options?.colors) {
          const index = theme.options.colors.findIndex(color => color.id === $settings.design?.theme);

          if (index !== -1) {
              colorStyle = theme.options?.colors[index].code ? theme.options.colors[index].code : '';
          }
      }

      if ($settings?.design?.bubbleTimeline) {
          bubbleStyle = theme?.options?.bubbleStyle  || '';
      }

      if (isDarkMode) {
          darkmodeStyle = theme.options?.darkmodeStyle ? theme.options.darkmodeStyle : '';
      }

      return theme.style + colorStyle + bubbleStyle + darkmodeStyle;
  }

  appState.init();
  viewPortSetting();
  setPostState();
  initColumns();

  $effect(() => {
      localStorage.setItem('settings', JSON.stringify($settings));
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

  $effect(() => {
    if ($locale === 'ko') {
      import('@fontsource-variable/noto-sans-kr/wght.css');
    }
  });

  $effect(() => {
    if ($settings?.design?.fontTheme === 'murecho') {
      import('@fontsource-variable/murecho/wght.css');
    }

    if ($settings?.design?.fontTheme === 'zenmaru') {
      import('@fontsource/zen-maru-gothic/index.css');
    }
  })
</script>

<svelte:head>
  <meta name="theme-color" content={baseColor}>
  <link rel="canonical" href="https://tokimeki.blue{page.url.pathname}">

  {#if ($settings?.embed?.x)}
    <script>window.twttr = (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0],
              t = window.twttr || {};
      if (d.getElementById(id)) return t;
      js = d.createElement(s);
      js.id = id;
      js.src = "https://platform.twitter.com/widgets.js";
      fjs.parentNode.insertBefore(js, fjs);

      t._e = [];
      t.ready = function(f) {
        t._e.push(f);
      };

      return t;
    }(document, "script", "twitter-wjs"));</script>
  {/if}
</svelte:head>

<div
    class="app {$_('dir', {default: 'ltr'})} lang-{$locale} font-size-{$settings.design?.fontSize || 2} font-theme-{$settings?.design?.fontTheme || 'default'}"
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:single={$settings?.design.layout !== 'decks'}
    class:ios={isMobile.iOS()}
    class:left-mode={$settings?.design?.leftMode}
    class:superstar={$settings.design?.reactionMode === 'superstar'}
    class:bubble={$settings?.design?.bubbleTimeline}
    style={outputInlineStyle($theme)}
    dir={$_('dir', {default: 'ltr'})}
    bind:this={app}
>
  {#if (appState.ready)}
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
    <div class="top-loading">
      <LoadingSpinner></LoadingSpinner>
    </div>
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

  .top-loading {
    height: 100vh;
    display: grid;
    place-content: center;
  }
</style>
