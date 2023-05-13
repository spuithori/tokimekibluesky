<script lang="ts">
    import MyProfileBadge from './MyProfileBadge.svelte';
    import Notification from './Notification.svelte';
    import { fade, fly } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { agent, notificationCount } from '$lib/stores';
    import { afterNavigate } from '$app/navigation';
    import Settings from './Settings.svelte';
    import { clickOutside } from '$lib/clickOutSide';

    let isNotificationOpen = false;
    let isSettingsOpen = false;

    async function notificationToggle() {
        isNotificationOpen = isNotificationOpen !== true;
        isSettingsOpen = false;

        if (isNotificationOpen) {
            await $agent.agent.api.app.bsky.notification.updateSeen( {seenAt: new Date().toISOString()});
            notificationCount.set(0);
        }
    }

    function settingsToggle() {
        isSettingsOpen = isSettingsOpen !== true;
        isNotificationOpen = false;
    }

    onMount(async () => {
        notificationCount.set(await $agent.getNotificationCount());
    })

    afterNavigate(async () => {
        isNotificationOpen = false;
    })
</script>

<header class="header">
  <div class="header__wrap">
    <div class="header__me only-pc">
      <MyProfileBadge></MyProfileBadge>
    </div>

    <div class="header__home only-pc">
      <a href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.131" height="18.788" viewBox="0 0 20.131 18.788">
          <g id="home" transform="translate(-16 -32)">
            <path id="パス_47" data-name="パス 47" d="M72.19,99.154a.335.335,0,0,0-.464,0L64,106.53a.336.336,0,0,0-.1.243v6.922a1.342,1.342,0,0,0,1.342,1.342h4.03a.671.671,0,0,0,.671-.671v-5.7a.336.336,0,0,1,.336-.336h3.355a.336.336,0,0,1,.336.336v5.7a.671.671,0,0,0,.671.671h4.029a1.342,1.342,0,0,0,1.342-1.342v-6.922a.336.336,0,0,0-.1-.243Z" transform="translate(-45.892 -64.248)" fill="var(--text-color-1)"/>
            <path id="パス_48" data-name="パス 48" d="M35.917,40.9l-3.137-3V33.342a.671.671,0,0,0-.671-.671H30.1a.671.671,0,0,0-.671.671v1.342L27,32.362A1.306,1.306,0,0,0,26.065,32h0a1.3,1.3,0,0,0-.929.362L16.216,40.9a.684.684,0,0,0-.056.938.671.671,0,0,0,.972.044l8.7-8.316a.336.336,0,0,1,.464,0L35,41.879a.671.671,0,0,0,.947-.018A.688.688,0,0,0,35.917,40.9Z" transform="translate(0)" fill="var(--text-color-1)"/>
          </g>
        </svg>
      </a>
    </div>

    <div class="header__settings">
      <button class="settings-toggle" aria-label="設定メニューを開く" on:click={settingsToggle}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16.559" height="14.01" viewBox="0 0 16.559 14.01">
          <g id="options" transform="translate(-48 -80.014)">
            <path id="パス_42" data-name="パス 42" d="M48.637,82.561h9.026a1.911,1.911,0,0,0,3.6,0h2.657a.637.637,0,1,0,0-1.274H61.265a1.911,1.911,0,0,0-3.6,0H48.637a.637.637,0,1,0,0,1.274Z" fill="var(--text-color-1)"/>
            <path id="パス_43" data-name="パス 43" d="M63.922,337.287H61.265a1.911,1.911,0,0,0-3.6,0H48.637a.637.637,0,0,0,0,1.274h9.026a1.911,1.911,0,0,0,3.6,0h2.657a.637.637,0,0,0,0-1.274Z" transform="translate(0 -245.81)" fill="var(--text-color-1)"/>
            <path id="パス_44" data-name="パス 44" d="M63.922,209.287H54.9a1.911,1.911,0,0,0-3.6,0H48.637a.637.637,0,1,0,0,1.274h2.657a1.911,1.911,0,0,0,3.6,0h9.026a.637.637,0,1,0,0-1.274Z" transform="translate(0 -122.905)" fill="var(--text-color-1)"/>
          </g>
        </svg>
      </button>

      {#if isSettingsOpen}
        <div class="settings-box"
             use:clickOutside={{ignoreElement: '.settings-toggle'}}
             on:outclick={() => (isSettingsOpen = false)}
             transition:fly="{{ y: 30, duration: 250 }}"
        >
          <Settings on:close={() => (isSettingsOpen = false)}></Settings>
        </div>
      {/if}
    </div>

    <div class="header__mention only-pc">
      <a href="/mention" class="header-mention">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.915" height="20.789" viewBox="0 0 20.915 20.789">
          <g id="at" transform="translate(-78.311 -77.27)">
            <path id="パス_49" data-name="パス 49" d="M183.333,178.54a4.331,4.331,0,0,1-4.3,4.27c-2.158,0-3.594-1.912-3.387-4.27a4.441,4.441,0,0,1,4.139-4.27A3.713,3.713,0,0,1,183.333,178.54Z" transform="translate(-91.171 -90.876)" fill="none" stroke="var(--text-color-1)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            <path id="パス_50" data-name="パス 50" d="M92.15,96.285a9.426,9.426,0,0,1-4.232.774,8.466,8.466,0,0,1-8.566-9.394A10.465,10.465,0,0,1,89.574,78.27c5.844,0,9.057,3.829,8.605,8.953-.337,3.825-2.781,4.928-4.061,4.7-1.2-.214-2.2-1.3-2.014-3.389l.453-5.137" transform="translate(0)" fill="none" stroke="var(--text-color-1)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </g>
        </svg>
      </a>
    </div>

    <div class="header__search only-pc">
      <a href="/search" class="header-search">
        <svg xmlns="http://www.w3.org/2000/svg" width="20.332" height="20.332" viewBox="0 0 20.332 20.332">
          <path id="search" d="M68.02,66.291l-4.609-4.609a8.567,8.567,0,1,0-1.729,1.729l4.609,4.609a1.225,1.225,0,0,0,1.729-1.729ZM50.445,56.559a6.114,6.114,0,1,1,6.114,6.114,6.114,6.114,0,0,1-6.114-6.114Z" transform="translate(-48 -48)" fill="var(--text-color-1)"/>
        </svg>
      </a>
    </div>

    <div class="header__notification">
      <button class="notification-button" on:click={notificationToggle} aria-label="Notification">
        <svg xmlns="http://www.w3.org/2000/svg" width="15.008" height="17.495" viewBox="0 0 15.008 17.495">
          <g id="notifications" transform="translate(-63.835 -32)">
            <path id="パス_45" data-name="パス 45" d="M78.528,44.079l-.191-.232c-.859-1.039-1.379-1.666-1.379-4.608a5.966,5.966,0,0,0-1.083-3.71,5.1,5.1,0,0,0-2.189-1.606.117.117,0,0,1-.032-.026,2.361,2.361,0,0,0-4.63,0,.122.122,0,0,1-.032.025c-2.2.906-3.272,2.645-3.272,5.316,0,2.943-.519,3.57-1.379,4.608-.062.075-.126.152-.191.232a1.373,1.373,0,0,0-.182,1.469,1.46,1.46,0,0,0,1.341.823H77.373a1.457,1.457,0,0,0,1.335-.82A1.373,1.373,0,0,0,78.528,44.079Z" fill="var(--text-color-1)"/>
            <path id="パス_46" data-name="パス 46" d="M187.874,433.874a3.126,3.126,0,0,0,2.751-1.645.156.156,0,0,0-.138-.229h-5.224a.156.156,0,0,0-.139.229A3.127,3.127,0,0,0,187.874,433.874Z" transform="translate(-116.535 -384.379)" fill="var(--text-color-1)"/>
          </g>
        </svg>
        {#if $notificationCount}
          <span class="notification-button__count">{$notificationCount}</span>
        {/if}
      </button>

      {#if isNotificationOpen}
        <div class="notification"
             use:clickOutside={{ignoreElement: '.notification-button'}}
             on:outclick={() => (isNotificationOpen = false)}
             transition:fly="{{ y: 30, duration: 250 }}"
        >
          <Notification></Notification>
        </div>
      {/if}
    </div>
  </div>
</header>

<style lang="postcss">
  .header {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background-color: var(--bg-color-1);
      z-index: 100;
      width: 740px;
      max-width: 100%;
      margin: 0 auto;
      box-shadow: 0 3px 6px rgba(0, 0, 0, .16);
      border-radius: 0 0 10px 10px;

      @media (max-width: 767px) {
          position: sticky;
          top: 10px;
          width: calc(100% - 40px);
          border-radius: 10px;
          box-shadow: 0 3px 6px rgba(0, 0, 0, .09);
      }
  }

  .header__wrap {
      padding: 0 20px;
      height: 70px;
      display: flex;
      align-items: center;
      gap: 15px;

      @media (max-width: 767px) {
          height: 60px;
          padding: 0 15px;
      }
  }

  .header__title {
      font-size: 20px;
      font-weight: 400;
      min-width: 0;
      margin-right: auto;


  }

  .header-logo-pc {
      @media (max-width: 767px) {
          display: none;
      }
  }

  .header-logo-sp {
      @media (min-width: 767px) {
          display: none;
      }
  }

  .header__title svg {
     
  }

  .header__notification {
      @media (max-width: 767px) {
          margin-left: auto;
      }
  }

  .header__settings {

  }

  .header__me {

  }

  .header__home {
      a {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background-color: var(--bg-color-1);
          box-shadow: 0 3px 8px rgba(0, 0, 0, .12);
          display: grid;
          place-content: center;
          position: relative;

          @media (max-width: 767px) {
              width: 38px;
              height: 38px;
          }
      }

  }

  .notification-button {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: var(--bg-color-1);
      box-shadow: 0 3px 8px rgba(0, 0, 0, .12);
      display: grid;
      place-content: center;
      position: relative;

      @media (max-width: 767px) {
          width: 38px;
          height: 38px;
      }

      &:hover {

      }
  }

  .notification-button__count {
      position: absolute;
      width: 16px;
      height: 16px;
      font-size: 11px;
      font-weight: bold;
      border-radius: 50%;
      background-color: var(--danger-color);
      color: var(--bg-color-1);
      display: grid;
      place-content: center;
      right: -4px;
      top: -4px;
  }

  .notification-button svg {
      width: 100%;
      height: auto;
      display: block;
  }

  .settings-toggle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: var(--bg-color-1);
      box-shadow: 0 3px 8px rgba(0, 0, 0, .12);
      display: grid;
      place-content: center;
      padding: 15px;
      position: relative;

      @media (max-width: 767px) {
          width: 38px;
          height: 38px;
      }

  }

  .header__search {

  }

  .header__mention {
      margin-left: auto;
  }

  .header-mention {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: var(--bg-color-1);
      box-shadow: 0 3px 8px rgba(0, 0, 0, .12);
      display: grid;
      place-content: center;
      position: relative;
  }

  .header-search {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: var(--bg-color-1);
      box-shadow: 0 3px 8px rgba(0, 0, 0, .12);
      display: grid;
      place-content: center;
      position: relative;

      svg {
          transition: transform .15s ease-in-out;
      }

      &:hover {
          svg {
              transform: translateY(2px);
          }
      }
  }

  .settings-box {
      position: absolute;
      top: 80px;
      left: 0;
      z-index: 200;

      @media (max-width: 767px) {
          right: 20px;
      }
  }

  .notification {
      position: absolute;
      top: 80px;
      right: 0;
      width: 500px;
      height: 600px;
      overflow: auto;
      background-color: var(--bg-color-1);
      border-radius: 8px;
      border: 1px solid var(--border-color-1);
      box-shadow: 0 0 16px rgba(0, 0, 0, .16);
      padding: 20px;
      z-index: 200;
  }

  @media (max-width: 767px) {
      .notification {
          position: fixed;
          top: 70px;
          bottom: 0;
          left: 0;
          right: 0;
          width: auto;
          height: auto;
      }
  }

  .logo-temp {
      display: flex;
      align-items: center;
      gap: 7px;
  }

  .logo-icon {
      img {
          width: 46px;
          height: auto;

          @media (max-width: 767px) {
              width: 38px;
          }
      }
  }
</style>