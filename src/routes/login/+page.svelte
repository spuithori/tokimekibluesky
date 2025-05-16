<script lang="ts">
    import '../styles.css';
    import { goto } from '$app/navigation';
    import { pwaInfo } from 'virtual:pwa-info';
    import { onMount } from 'svelte';
    import LoginModal from "$lib/components/acp/LoginModal.svelte";
    import {_} from "svelte-i18n";
    import { Toaster } from "svelte-sonner";
    import {accountsDb} from "$lib/db";

    let isLoginModalOpen = $state(false);

    function handleSuccess() {
        goto('/');
    }

    onMount(async() => {
        const accounts = await accountsDb.accounts
            .toArray();
        if (accounts.length) {
            console.log('Accounts are already registered.');
            await goto('/');
        }

        if (pwaInfo) {
            const { registerSW } = await import('virtual:pwa-register')
            registerSW({
                immediate: true,
                onRegistered(r) {
                    console.log(`SW Registered`)
                },
                onRegisterError(error) {
                    console.log('SW registration error', error)
                }
            })
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

<section class="login">
  <h1 class="login-logo">
    <img src="/tbc-logo.svg" alt="TOKIMEKI - Bluesky client project">
  </h1>

  <div class="login-box">
    <h1 class="login-box__title">{$_('about_subhead')}</h1>
    <p class="login-box__text">{$_('login_box_text_1_1')}<a href="https://blueskyweb.xyz/" target="_blank" rel="noopener">Bluesky</a>{$_('login_box_text_1_2')}</p>
    <p class="login-box__text">{$_('login_box_text_2')}</p>

    <div class="login-box__buttons">
      <button class="button button--fullwidth" onclick={() => {isLoginModalOpen = true}}>{$_('login')}</button>
      <a class="button button--border button--fullwidth" href="https://docs.tokimeki.blue/ja#%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%BC%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%83%E3%83%88" target="_blank" rel="noopener">{$_('show_screenshots')}</a>
    </div>
  </div>

  <div class="login-bg-picture"></div>
</section>

{#if isLoginModalOpen}
  <LoginModal on:success={handleSuccess} on:cancel={() => {isLoginModalOpen = false}}></LoginModal>
{/if}

<Toaster position="top-center"></Toaster>

<style lang="postcss">
  .login {
      min-height: 100vh;
      font-family: sans-serif;
      overflow-y: auto;
  }

  .login-bg-picture {
      background-image: url(/login-bg.jpg);
      background-size: cover;
      background-position: center;
      position: fixed;
      top: 40px;
      bottom: 40px;
      right: 40px;
      width: calc(100vw - 460px);
      border-radius: 50px;

      @media (max-width: 767px) {
          width: 100vw;
          right: 0;
          bottom: 0;
          height: 40vh;
          top: auto;
          border-radius: 30px 30px 0 0;
      }
  }

  .login-box {
      width: 100%;
      height: max-content;
      max-width: 300px;
      background-color: #fff;
      box-shadow: 0 0 40px rgba(0, 0, 0, .16);
      padding: 32px 24px;
      border-radius: 15px;
      backdrop-filter: blur(2px);
      position: fixed;
      top: 0;
      bottom: 0;
      left: 200px;
      margin: auto;
      z-index: 1;
      font-family: sans-serif;

      @media (max-width: 767px) {
          position: relative;
          left: auto;
          top: auto;
          bottom: auto;
          margin-top: 64px;
          margin-bottom: 300px;
      }

      &__title {
          font-size: 18px;
          text-align: left;
          margin-bottom: 16px;
      }

      &__text {
          margin-bottom: 8px;
          line-height: 1.75;
      }

      &__buttons {
          margin-top: 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
      }
  }

  .login-logo {
      position: absolute;
      left: 40px;
      top: 40px;

      @media (max-width: 767px) {
          left: 16px;
          top: 16px;
          position: relative;

          img {
              width: 180px;
          }
      }
  }
</style>