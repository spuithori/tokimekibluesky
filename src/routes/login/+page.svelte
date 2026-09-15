<script lang="ts">
    import '../styles.css';
    import '@fontsource-variable/inter';
    import '@fontsource-variable/noto-sans-jp';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';
    import LoginForm from "$lib/components/acp/LoginForm.svelte";
    import {_} from "tokimeki-i18n";
    import { Toaster } from "svelte-sonner";
    import {accountsDb} from "$lib/db";
    import { tick } from 'svelte';
    import Columns3 from '@lucide/svelte/icons/columns-3';
    import Users from '@lucide/svelte/icons/users';
    import BellRing from '@lucide/svelte/icons/bell-ring';
    import CalendarClock from '@lucide/svelte/icons/calendar-clock';
    import Palette from '@lucide/svelte/icons/palette';
    import Keyboard from '@lucide/svelte/icons/keyboard';
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';

    let demoReady = $state(false);
    let flipped = $state(false);
    let backEl = $state<HTMLElement | undefined>();
    let signInEl = $state<HTMLButtonElement | undefined>();

    function focusFace() {
        if (flipped) {
            backEl?.querySelector<HTMLInputElement>('#handle')?.focus({ preventScroll: true });
        } else {
            signInEl?.focus({ preventScroll: true });
        }
    }

    async function flip(next: boolean) {
        flipped = next;
        await tick();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            focusFace();
        }
    }

    function handleFlipEnd(event: TransitionEvent) {
        if (event.target === event.currentTarget && event.propertyName === 'transform') {
            focusFace();
        }
    }

    function handleSuccess() {
        goto('/');
    }

    onMount(async() => {
        const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 200));
        idle(() => { demoReady = true; });

        const accounts = await accountsDb.accounts
            .toArray();
        if (accounts.length) {
            await goto('/');
        }
    })
</script>

<svelte:head>
  <title>TOKIMEKI - Bluesky client project</title>
  <link rel="canonical" href="https://tokimeki.blue">
  <meta name="description" content="TOKIMEKI is a Bluesky browser client with multi-column and multi-account support.">
  <meta property="og:site_name" content="TOKIMEKI">
  <meta property="og:title" content="TOKIMEKI - Bluesky client project">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://tokimeki.blue">
  <meta property="og:image" content="https://tokimeki.blue/login-bg.jpg">
  <meta property="og:description" content="TOKIMEKI is a Bluesky browser client with multi-column and multi-account support.">
</svelte:head>

<div class="login">
  <figure class="login-picture">
    <picture>
      <source
        type="image/avif"
        srcset="/login-bg-640.avif 640w, /login-bg-1024.avif 1024w, /login-bg-1440.avif 1440w, /login-bg-2000.avif 2000w"
        sizes="100vw"
      >
      <source
        type="image/webp"
        srcset="/login-bg-640.webp 640w, /login-bg-1024.webp 1024w, /login-bg-1440.webp 1440w, /login-bg-2000.webp 2000w"
        sizes="100vw"
      >
      <img
        src="/login-bg-1440.jpg"
        alt=""
        width="2000"
        height="1334"
        fetchpriority="high"
        decoding="async"
      >
    </picture>
  </figure>

  <div class="login-block">
    <header class="login-header">
      <h1 class="login-logo">
        <img src="/tbc-logo.svg" alt="TOKIMEKI - Bluesky client project" width="200" height="31">
      </h1>

      <nav class="login-links" aria-label="Help">
        <a href="https://docs.tokimeki.blue/{$_('docs_locale_path')}" target="_blank" rel="noopener">{$_('login_guide_link')}</a>
        <a href="https://bsky.app/profile/tokimeki.blue" target="_blank" rel="noopener">@tokimeki.blue</a>
      </nav>
    </header>

    <main class="login-stage">
      <section class="login-card" class:login-card--flipped={flipped}>
        <div class="login-card__inner" ontransitionend={handleFlipEnd}>
          <div class="login-card__face login-card__face--front" inert={flipped ? true : undefined} aria-labelledby="login-title">
            <p class="login-card__kicker">{$_('login_front_kicker')}</p>
            <h2 class="login-card__title" id="login-title">{$_('about_subhead')}</h2>
            <p class="login-card__lead">{$_('login_front_lead_before')}<a href="https://bsky.app" target="_blank" rel="noopener">Bluesky</a>{$_('login_front_lead_after')}</p>

            <ul class="login-features">
              <li><Columns3 size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('login_feature_columns')}</span></li>
              <li><Users size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('login_feature_accounts')}</span></li>
              <li><BellRing size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('settings_push_notification')}</span></li>
              <li><CalendarClock size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('schedule_post_title')}</span></li>
              <li><Palette size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('login_feature_themes')}</span></li>
              <li><Keyboard size={18} color="var(--primary-color)" strokeWidth={2.25} /><span>{$_('login_feature_keyboard')}</span></li>
            </ul>

            <button class="button login-card__signin" type="button" onclick={() => flip(true)} bind:this={signInEl}>{$_('login_sign_in')}</button>

            <p class="login-card__signup">
              <a href="https://bsky.app" target="_blank" rel="noopener">{$_('login_create_account')}</a>
            </p>
          </div>

          <div class="login-card__face login-card__face--back" inert={flipped ? undefined : true} bind:this={backEl}>
            <button class="login-card__back" type="button" onclick={() => flip(false)}>
              <ArrowLeft size={16} color="currentColor" />
              {$_('back')}
            </button>
            <h2 class="login-card__title login-card__title--back">{$_('login_sign_in')}</h2>

            <LoginForm mode="page" onsuccess={handleSuccess} />

            <p class="login-card__signup">
              <a href="https://bsky.app" target="_blank" rel="noopener">{$_('login_create_account')}</a>
            </p>
          </div>
        </div>
      </section>

      <div class="login-deck">
        {#if demoReady}
          {#await import('$lib/components/demo/DemoDeck.svelte') then { default: DemoDeck }}
            <DemoDeck></DemoDeck>
          {/await}
        {/if}
      </div>
    </main>
  </div>
</div>

<Toaster position="top-center"></Toaster>

<style lang="postcss">
  .login {
      --login-gutter: 40px;
      --login-block-max: 1760px;
      --login-card-width: 400px;
      --login-header-height: 76px;
      --login-zoom: 1;
      --login-hero-height: 100dvh;
      --login-card-top: max(24px, min(calc(36dvh / var(--login-zoom)), calc(100dvh / var(--login-zoom) - 500px)));
      --login-deck-top: calc(64dvh / var(--login-zoom));
      --login-ease: cubic-bezier(.22, 1, .36, 1);
      --demo-col-width: 320px;
      --demo-gap: 12px;

      position: relative;
      font-family: var(--ui-font), var(--font-body), sans-serif;
      color: var(--text-color-1);
      background-color: #e3edf4;
      overflow-x: clip;
      isolation: isolate;

      @media (max-width: 1279px) {
          --login-card-width: 372px;
          --demo-col-width: 300px;
      }

      @media (min-width: 2200px) {
          --login-zoom: 1.2;
      }

      @media (min-width: 3000px) {
          --login-zoom: 1.6;
      }

      @media (max-width: 767px) {
          --login-gutter: 20px;
          --login-header-height: 64px;

          display: flex;
          flex-direction: column;
      }
  }

  .login-picture {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: var(--login-hero-height);
      margin: 0;
      z-index: -1;
      animation: login-reveal 1.1s var(--login-ease) both;

      picture,
      img {
          display: block;
          width: 100%;
          height: 100%;
      }

      img {
          object-fit: cover;
          object-position: 50% 22%;
      }

      &::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 28%;
          background: linear-gradient(to bottom, rgba(227, 237, 244, 0), #e3edf4);
      }

      @media (max-width: 767px) {
          position: relative;
          order: 1;
          height: 42vh;
          min-height: 280px;
          z-index: 0;
          margin: 0 var(--login-gutter);
          width: auto;

          img {
              object-position: 50% 30%;
              border-radius: 28px;
          }

          &::after {
              display: none;
          }
      }
  }

  .login-block {
      max-width: var(--login-block-max);
      margin: 0 auto;
      position: relative;

      zoom: var(--login-zoom);

      @media (max-width: 767px) {
          display: contents;
      }
  }

  .login-header {
      height: var(--login-header-height);
      padding: 0 var(--login-gutter);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      animation: login-rise .6s var(--login-ease) both;

      @media (max-width: 767px) {
          order: 0;
      }
  }

  .login-logo {
      margin: 0;
      line-height: 0;

      img {
          width: 200px;
          height: auto;

          @media (max-width: 767px) {
              width: 160px;
          }
      }
  }

  .login-features {
      list-style: none;
      margin: 0 0 22px;
      padding: 14px 0 0;
      border-top: 1px solid var(--border-color-2);
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 9px 10px;

      li {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color-1);
          line-height: 1.4;
          min-width: 0;

          :global(svg) {
              flex-shrink: 0;
          }
      }
  }

  .login-links {
      display: flex;
      align-items: baseline;
      gap: 20px;
      font-size: 13px;
      font-weight: 600;

      a {
          color: rgba(20, 40, 60, .78);
          text-decoration: none;
          text-shadow: 0 1px 8px rgba(255, 255, 255, .7);

          &:hover {
              color: #14283c;
              text-decoration: underline;
          }
      }

      @media (max-width: 767px) {
          display: none;
      }
  }

  .login-stage {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      min-height: max(560px, calc(100dvh / var(--login-zoom) - var(--login-header-height)));
      padding: 0 var(--login-gutter);

      @media (max-width: 767px) {
          order: 2;
          display: block;
          min-height: 0;
          padding: 0;
          margin-top: -30px;
      }
  }

  .login-card {
      position: relative;
      z-index: 2;
      margin-top: calc(var(--login-card-top) - var(--login-header-height));
      margin-bottom: 32px;
      width: var(--login-card-width);
      perspective: 1600px;
      animation: login-rise .7s var(--login-ease) .1s both;

      @media (max-width: 767px) {
          width: auto;
          margin: 0 var(--login-gutter);
      }

      &__inner {
          display: grid;
          transform-style: preserve-3d;
          transition: transform .7s cubic-bezier(.4, 0, .2, 1);
      }

      &--flipped &__inner {
          transform: rotateY(180deg);
      }

      &__face {
          grid-area: 1 / 1;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          background-color: rgba(255, 255, 255, .94);
          backdrop-filter: blur(12px);
          border-radius: 28px;
          padding: 28px 32px 26px;
          box-shadow:
              0 1px 2px rgba(20, 60, 90, .08),
              0 32px 64px -32px rgba(20, 60, 90, .45);
          transition: visibility 0s linear .35s;

          @media (prefers-reduced-motion: reduce) {
              transition: none;
          }

          @media (max-width: 767px) {
              padding: 24px 22px 22px;
              border-radius: 24px;
              background-color: #fff;
              backdrop-filter: none;
          }

          &--back {
              transform: rotateY(180deg);
              visibility: hidden;
          }
      }

      &--flipped &__face--front {
          visibility: hidden;
      }

      &--flipped &__face--back {
          visibility: visible;
      }

      &__kicker {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: .04em;
          color: var(--primary-color);
          margin: 0 0 8px;
      }

      &__title {
          font-size: 20px;
          font-weight: 800;
          line-height: 1.4;
          letter-spacing: .01em;
          margin: 0 0 10px;
          text-wrap: balance;

          &--back {
              margin: 4px 0 20px;
          }
      }

      &__lead {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--text-color-2);
          margin: 0 0 18px;

          a {
              color: var(--text-color-1);
              font-weight: 600;
              text-decoration: underline;
              text-underline-offset: 2px;
          }
      }

      &__signin {
          width: 100%;
          min-width: 0;
      }

      &__back {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-color-3);
          margin: -6px 0 0 -6px;
          padding: 4px 8px 4px 6px;
          border-radius: 999px;
          transition: background-color .15s ease, color .15s ease;

          &:hover {
              background-color: var(--bg-color-2);
              color: var(--text-color-1);
          }

          &:focus-visible {
              outline: 2px solid var(--primary-color);
              outline-offset: 2px;
          }
      }

      &__signup {
          margin: 20px 0 0;
          font-size: 13px;
          line-height: 1.6;
          text-align: center;

          a {
              color: var(--text-color-1);
              font-weight: 600;
              text-decoration: underline;
              text-underline-offset: 2px;
          }
      }
  }

  .login-deck {
      position: absolute;
      top: calc(var(--login-deck-top) - var(--login-header-height));
      left: calc(var(--login-gutter) + var(--login-card-width) + 32px);
      right: 0;
      bottom: 0;
      z-index: 1;
      padding: 14px 0 0 14px;
      border-radius: 28px 0 0 0;
      background-color: rgba(255, 255, 255, .42);
      backdrop-filter: blur(18px) saturate(1.2);
      box-shadow: inset 1px 1px 0 rgba(255, 255, 255, .7), 0 -24px 60px -30px rgba(20, 60, 90, .35);
      mask-image: linear-gradient(to bottom, #000 86%, transparent), linear-gradient(to right, #000 calc(100% - 140px), transparent);
      mask-composite: intersect;
      -webkit-mask-composite: source-in;
      animation: login-rise .8s var(--login-ease) .2s both;

      @media (max-width: 767px) {
          position: relative;
          top: auto;
          left: auto;
          right: auto;
          bottom: auto;
          height: 68dvh;
          margin-top: 24px;
          padding: 0 0 0 var(--login-gutter);
          border-radius: 0;
          background-color: transparent;
          backdrop-filter: none;
          box-shadow: none;
          mask-image: linear-gradient(to bottom, #000 88%, transparent);
          animation: none;
      }
  }

  @keyframes login-rise {
      from {
          opacity: 0;
          transform: translateY(14px);
      }
      to {
          opacity: 1;
          transform: none;
      }
  }

  @keyframes login-reveal {
      from {
          opacity: 0;
          transform: scale(1.04);
      }
      to {
          opacity: 1;
          transform: none;
      }
  }

  @media (prefers-reduced-motion: reduce) {
      .login-picture,
      .login-header,
      .login-card,
      .login-deck {
          animation: none;
      }

      .login-card__inner {
          transition: none;
      }
  }
</style>
