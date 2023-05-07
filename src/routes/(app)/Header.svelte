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
    <h1 class="header__title text-sm"><a href="/">
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="172.832" height="39.899" viewBox="0 0 172.832 39.899" class="header-logo-pc">
        <defs>
          <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#caecee"/>
            <stop offset="1" stop-color="#8c56d3"/>
          </linearGradient>
          <clipPath id="clip-path">
            <rect id="長方形_83" data-name="長方形 83" width="61.472" height="39.899" transform="translate(0)" fill="url(#linear-gradient)"/>
          </clipPath>
          <linearGradient id="linear-gradient-2" x1="1" y1="0.4" x2="-0.112" y2="0.391" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#ffa3b2"/>
            <stop offset="0.268" stop-color="#ec86d6"/>
            <stop offset="0.536" stop-color="#73f08d"/>
            <stop offset="0.789" stop-color="#75c0e5"/>
            <stop offset="1" stop-color="#923ec9"/>
          </linearGradient>
          <linearGradient id="linear-gradient-3" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#afe2ff"/>
            <stop offset="1" stop-color="#fff"/>
          </linearGradient>
        </defs>
        <g id="グループ_110" data-name="グループ 110" transform="translate(-396.639 -242.809)">
          <g id="マスクグループ_5" data-name="マスクグループ 5" transform="translate(396.639 242.809)" clip-path="url(#clip-path)">
            <g id="グループ_107" data-name="グループ 107" transform="translate(4.036 0)">
              <circle id="楕円形_27" data-name="楕円形 27" cx="27.631" cy="27.631" r="27.631" opacity="0.61" fill="url(#linear-gradient-2)"/>
              <path id="パス_34" data-name="パス 34" d="M22.053,0A22.053,22.053,0,1,1,0,22.053,22.053,22.053,0,0,1,22.053,0Z" transform="translate(5.612 7.876)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_28" data-name="楕円形 28" cx="16.455" cy="16.455" r="16.455" transform="translate(11.177 15.802)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_29" data-name="楕円形 29" cx="11.022" cy="11.022" r="11.022" transform="translate(16.765 23.702)" fill="var(--bg-color-1)"/>
            </g>
          </g>
          <g id="グループ_111" data-name="グループ 111">
            <path id="パス_35" data-name="パス 35" d="M-189.6-28.714V-29.7h-10.513a1.784,1.784,0,0,0-1.9,1.714v1.028h4.5v10.81a1.85,1.85,0,0,0,1.9,2.1h1.257V-26.954h2.88A1.986,1.986,0,0,0-189.6-28.714Zm16.227,6.605c0-4.959-3.36-7.862-7.154-7.862-4.754,0-7.5,3.474-7.5,8.342,0,4.685,3.2,7.862,7.154,7.862C-176.1-13.767-173.377-17.355-173.377-22.109Zm-3.223.434c0,3.451-1.554,5.188-3.977,5.188-2.857,0-4.228-1.851-4.228-5.622,0-3.2,1.668-5.1,3.977-5.1C-178.176-27.206-176.6-25.354-176.6-21.675Zm7.359-8.022h-1.006v13.53a1.931,1.931,0,0,0,2.057,2.125h1.028v-7.908a53.964,53.964,0,0,0,5.028,6.971,3.123,3.123,0,0,0,2.194,1.006,1.742,1.742,0,0,0,2.011-1.577,2.918,2.918,0,0,1-1.234-.64c-1.988-1.691-3.405-4.068-4.868-6.194a81,81,0,0,1,5.9-7.2V-29.7h-2.148a2.436,2.436,0,0,0-2.377.96,48.128,48.128,0,0,0-4.5,6.034v-4.891A1.922,1.922,0,0,0-169.24-29.7Zm16.753,15.656V-28.028a1.691,1.691,0,0,0-1.668-1.668h-1.417v13.576a1.938,1.938,0,0,0,1.9,2.08Zm21.621,0c0-3.131-.457-9.942-.754-12.41-.251-2.148-1.394-3.245-3.131-3.245h-.366a10.922,10.922,0,0,0-2.445,4.594l-1.806,5.554a14.758,14.758,0,0,0-.434,1.6,20.675,20.675,0,0,0-.891-2.971l-2.171-6.125c-.594-1.668-2.125-2.651-4.3-2.651h-.663a102.535,102.535,0,0,0-1.257,13.576,1.881,1.881,0,0,0,1.966,2.08h1.1a96.727,96.727,0,0,1,.686-11.382c.229.549.594,1.486.868,2.285l2.24,6.605c.571,1.691,1.486,2.491,2.514,2.491h.846a11.457,11.457,0,0,0,1.28-2.788l2.194-6.719c.229-.709.526-1.348.731-1.851.251,1.554.594,7.291.594,9.279a1.859,1.859,0,0,0,2.011,2.08Zm14.216-2.925a15.722,15.722,0,0,1-3.428.343h-1.006c-2.423,0-3.314-.526-3.314-3.245v-.914h4.137c1.257,0,1.9-.411,1.9-1.44v-1.12H-124.4A29.881,29.881,0,0,1-124.17-27h5.371c1.44,0,2.1-.549,2.1-1.646V-29.7h-8.182c-1.28,0-2.148.48-2.4,2.354a32.932,32.932,0,0,0-.3,4.411v2.9c0,4,2.011,6.1,5.828,6.1h1.668c2.743,0,3.383-.686,3.405-1.943Zm3.68-12.73h-1.006v13.53a1.931,1.931,0,0,0,2.057,2.125h1.028v-7.908a53.967,53.967,0,0,0,5.028,6.971,3.123,3.123,0,0,0,2.194,1.006,1.742,1.742,0,0,0,2.011-1.577,2.918,2.918,0,0,1-1.234-.64c-1.988-1.691-3.405-4.068-4.868-6.194a81,81,0,0,1,5.9-7.2V-29.7h-2.148a2.436,2.436,0,0,0-2.377.96,48.133,48.133,0,0,0-4.5,6.034v-4.891A1.922,1.922,0,0,0-112.971-29.7Zm16.753,15.656V-28.028A1.691,1.691,0,0,0-97.887-29.7H-99.3v13.576a1.938,1.938,0,0,0,1.9,2.08Z" transform="translate(665.69 280.619)" fill="var(--text-color-1)"/>
            <path id="パス_39" data-name="パス 39" d="M-170.026-12.623a2.115,2.115,0,0,0-1.5-1.861,1.75,1.75,0,0,0,1.352-1.8c0-1.389-1.154-2.245-2.779-2.245h-1.03a8.75,8.75,0,0,0-2.245.385v6.165c0,1.327.781,2.022,2.369,2.022h.918A2.686,2.686,0,0,0-170.026-12.623Zm-1.848-3.51c0,.732-.62,1.03-1.377,1.03h-1.3v-1.923a5.322,5.322,0,0,1,.732-.087h.633C-172.556-17.113-171.874-16.877-171.874-16.133Zm.136,3.56c0,.645-.447,1.067-1.364,1.067h-.695c-.422,0-.744-.236-.744-.533v-1.749h1.352C-172.2-13.789-171.738-13.491-171.738-12.573Zm6.45,1.637v-.36h-.447c-.781,0-1.129-.211-1.129-.881v-5.632a1.052,1.052,0,0,0-1.191-1.116h-.471v6.909A1.889,1.889,0,0,0-166.4-9.931C-165.672-9.931-165.287-10.216-165.287-10.936Zm6.748-2.059V-15.5c0-.781-.409-1.191-1.377-1.191h-.3v3.759c0,1.141-.484,1.613-1.166,1.613-.757,0-1.352-.5-1.352-1.724V-15.5c0-.781-.422-1.191-1.377-1.191h-.31v3.808a2.829,2.829,0,0,0,2.952,3.039C-159.519-9.844-158.539-10.911-158.539-12.995Zm7.381-1.253a2.586,2.586,0,0,0-2.679-2.593c-1.91,0-3.275,1.4-3.275,3.634a3.3,3.3,0,0,0,3.287,3.362c1.836,0,2.419-.657,2.419-1.513v-.521h-.062a3.03,3.03,0,0,1-2.047.633,1.736,1.736,0,0,1-1.873-1.377h1.092C-152.089-12.623-151.159-13.019-151.159-14.247Zm-1.563-.2c0,.471-.36.645-1.935.645h-.744l.012-.223a1.43,1.43,0,0,1,1.4-1.427C-153.218-15.451-152.722-15.116-152.722-14.446Zm7.778,2.344c0-1.067-.744-1.675-2.134-1.9-1.141-.186-1.34-.323-1.34-.657,0-.434.323-.744,1.34-.744a2.921,2.921,0,0,1,1.91.62h.062v-.633c0-.645-.62-1.427-2.134-1.427-1.712,0-2.841,1.067-2.841,2.32,0,1.017.682,1.575,2.1,1.774,1.154.161,1.389.347,1.389.732,0,.5-.4.732-1.216.732a3.334,3.334,0,0,1-2.01-.633h-.062v.757c0,.682.918,1.315,2.146,1.315C-145.936-9.844-144.944-10.687-144.944-12.1Zm2.01-6.822h-.533v7.753c0,.769.36,1.178,1.1,1.178h.571v-3.275a28.526,28.526,0,0,0,2.332,2.853,1.631,1.631,0,0,0,1.092.459,1.023,1.023,0,0,0,1.129-.819,2.811,2.811,0,0,1-1.29-.868c-.6-.608-1.116-1.29-1.65-1.947a35.236,35.236,0,0,1,2.717-3.039v-.062h-.955a1.715,1.715,0,0,0-1.327.434,17.89,17.89,0,0,0-2.047,2.431V-17.82A1.011,1.011,0,0,0-142.935-18.924Zm10.457,7.492A25.544,25.544,0,0,0-131-15.91c0-.546-.248-.781-.781-.781h-.719a18.847,18.847,0,0,1-1.3,4.639,14.4,14.4,0,0,1-1.34-3.858.971.971,0,0,0-.968-.781h-.881a21.188,21.188,0,0,0,2.369,6.227c-.36.943-.571,1.191-1.178,1.228l-.943.062v.323a1.085,1.085,0,0,0,1.166,1.03C-134.375-7.822-133.718-8.5-132.478-11.432Zm11.933-4.788v-.657c0-1.166-1.017-1.737-2.406-1.737a4.2,4.2,0,0,0-4.342,4.466,4.119,4.119,0,0,0,4.193,4.23c1.178,0,2.531-.5,2.531-1.662v-.633h-.062a3.346,3.346,0,0,1-2.245.819c-1.6,0-2.7-1-2.7-3a2.58,2.58,0,0,1,2.642-2.741,3.045,3.045,0,0,1,2.332.918Zm4.379,5.284v-.36h-.447c-.781,0-1.129-.211-1.129-.881v-5.632a1.052,1.052,0,0,0-1.191-1.116h-.471v6.909a1.889,1.889,0,0,0,2.121,2.084C-116.55-9.931-116.166-10.216-116.166-10.936Zm2.878-7.207a.979.979,0,0,0-.98-.968.969.969,0,0,0-.968.968.979.979,0,0,0,.968.98A.99.99,0,0,0-113.288-18.142Zm1.191,7.207v-.36h-.31c-.732,0-1.017-.211-1.017-.881V-15.3a1.088,1.088,0,0,0-1.191-1.24h-.471v4.528a1.837,1.837,0,0,0,2,2.084C-112.382-9.931-112.1-10.216-112.1-10.936Zm6.7-3.312a2.586,2.586,0,0,0-2.679-2.593c-1.91,0-3.275,1.4-3.275,3.634a3.3,3.3,0,0,0,3.287,3.362c1.836,0,2.419-.657,2.419-1.513v-.521h-.062a3.03,3.03,0,0,1-2.047.633,1.736,1.736,0,0,1-1.873-1.377h1.092C-106.329-12.623-105.4-13.019-105.4-14.247Zm-1.563-.2c0,.471-.36.645-1.935.645h-.744l.012-.223a1.43,1.43,0,0,1,1.4-1.427C-107.458-15.451-106.962-15.116-106.962-14.446ZM-98.1-9.993v-3.895a2.766,2.766,0,0,0-2.878-2.952A2.79,2.79,0,0,0-104-13.975v2.89a1.083,1.083,0,0,0,1.166,1.092h.5v-3.87c0-.955.5-1.5,1.216-1.5.856,0,1.352.5,1.352,1.625v2.655a1.105,1.105,0,0,0,1.216,1.092Zm1.8-6.425V-12.4A2.234,2.234,0,0,0-93.8-9.918c.968,0,1.464-.434,1.464-1.116v-.6H-92.4a2.37,2.37,0,0,1-1.2.236c-.67,0-1.054-.335-1.054-1.2v-2.617h1.327a.884.884,0,0,0,.992-.794v-.682h-2.32V-18.2h-.385a1.163,1.163,0,0,0-.781.459A1.663,1.663,0,0,0-96.306-16.418Z" transform="translate(641.673 290.53)" fill="var(--text-color-1)"/>
          </g>
        </g>
      </svg>
      <svg class="header-logo-sp" xmlns="http://www.w3.org/2000/svg" width="55.545" height="40.103" viewBox="0 0 55.545 40.103"><defs><linearGradient id="a" x1=".5" x2=".5" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#caecee"/><stop offset="1" stop-color="#8c56d3"/></linearGradient><linearGradient id="c" x1="1" y1=".4" x2="-.112" y2=".391" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#ffa3b2"/><stop offset=".268" stop-color="#ec86d6"/><stop offset=".536" stop-color="#73f08d"/><stop offset=".789" stop-color="#75c0e5"/><stop offset="1" stop-color="#923ec9"/></linearGradient><linearGradient id="d" x1=".5" x2=".5" y2="1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#afe2ff"/><stop offset="1" stop-color="#fff"/></linearGradient><clipPath id="b"><path data-name="長方形 87" fill="url(#a)" d="M0 0h55.545v40.103H0z"/></clipPath></defs><g data-name="マスクグループ 7" clip-path="url(#b)"><g data-name="グループ 109"><circle data-name="楕円形 33" cx="27.772" cy="27.772" r="27.772" opacity=".61" fill="url(#c)"/><path data-name="パス 37" d="M22.165 0A22.165 22.165 0 1 1 0 22.165 22.165 22.165 0 0 1 22.165 0Z" transform="translate(5.641 7.917)" fill="url(#d)"/><circle data-name="楕円形 34" cx="16.539" cy="16.539" r="16.539" transform="translate(11.234 15.882)" fill="url(#d)"/><circle data-name="楕円形 35" cx="11.078" cy="11.078" r="11.078" transform="translate(16.851 23.823)" fill="var(--bg-color-1)"/></g></g></svg>
    </a></h1>

    <div class="header__search">
      <a href="/search" class="header-search">
        <svg xmlns="http://www.w3.org/2000/svg" width="21.67" height="21.659" viewBox="0 0 21.67 21.659">
          <path id="search" d="M14.214,15.778a8.814,8.814,0,1,1,1.554-1.554L21.662,20.1,20.1,21.661l-5.873-5.884Zm-5.4-.353A6.611,6.611,0,1,0,2.2,8.814a6.611,6.611,0,0,0,6.611,6.611Z" transform="translate(0.008 -0.002)" fill="var(--text-color-3)"/>
        </svg>
      </a>
    </div>

    <div class="header__settings">
      <button class="settings-toggle" aria-label="設定メニューを開く" on:click={settingsToggle}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path id="cog" d="M4.728,7.8,2.664,4.368l1.7-1.7L7.8,4.728a8.49,8.49,0,0,1,2.04-.84L10.8,0h2.4l.96,3.888a8.49,8.49,0,0,1,2.04.84l3.432-2.064,1.7,1.7L19.272,7.8a8.49,8.49,0,0,1,.84,2.04L24,10.8v2.4l-3.888.96a8.49,8.49,0,0,1-.84,2.04l2.064,3.432-1.7,1.7L16.2,19.272a8.49,8.49,0,0,1-2.04.84L13.2,24H10.8l-.96-3.888a8.49,8.49,0,0,1-2.04-.84L4.368,21.336l-1.7-1.7L4.728,16.2a8.49,8.49,0,0,1-.84-2.04L0,13.2V10.8l3.888-.96a8.49,8.49,0,0,1,.84-2.04ZM12,15.6a3.6,3.6,0,1,0,0-7.2h0a3.6,3.6,0,0,0,0,7.2Z" transform="translate(0 0)" fill="var(--text-color-3)"/>
        </svg>
      </button>

      {#if isSettingsOpen}
        <div class="settings-box"
             use:clickOutside={{ignoreElement: '.settings-toggle'}}
             on:outclick={() => (isSettingsOpen = false)}
             transition:fly="{{ y: 30, duration: 250 }}"
        >
          <Settings></Settings>
        </div>
      {/if}
    </div>

    <div class="header__notification">
      <button class="notification-button" on:click={notificationToggle} aria-label="Notification">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="19.985" viewBox="0 0 18 19.985">
          <path id="notifications" d="M4,8A6,6,0,0,1,8.03,2.33a2,2,0,1,1,3.95,0A6,6,0,0,1,16,8v6l3,2v1H1V16l3-2Zm8,10a2,2,0,0,1-4,0Z" transform="translate(-1 -0.015)" fill="var(--text-color-3)"/>
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

    <div class="header__me">
      <MyProfileBadge></MyProfileBadge>
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
  }

  .header__wrap {
      padding: 0 20px;
      height: 70px;
      display: flex;
      align-items: center;
      gap: 15px;
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
      width: 100%;
  }

  .header__notification {

  }

  .header__settings {

  }

  .header__me {

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

      svg {
          transition: transform .15s ease-in-out;
      }

      &:hover {
          svg {
              transform: translateY(2px);
          }
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

      svg {
          transition: transform .15s ease-in-out;
      }

      &:hover {
          svg {
              transform: rotate(30deg);
          }
      }
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
      right: 0;
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