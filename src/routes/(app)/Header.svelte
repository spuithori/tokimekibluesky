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
    <h1 class="header__title text-sm"><a href="/"><svg xmlns="http://www.w3.org/2000/svg" width="233.607" height="30.342" viewBox="0 0 233.607 30.342" fill="var(--text-color-1)">
      <g id="グループ_3" data-name="グループ 3" transform="translate(-1129.063 -606.326)">
        <path id="パス_2" data-name="パス 2" d="M-175.6-14.124v-.946h-10.12a1.718,1.718,0,0,0-1.826,1.65v.99h4.334V-2.024A1.781,1.781,0,0,0-181.39,0h1.21V-12.43h2.772A1.912,1.912,0,0,0-175.6-14.124Zm15.18,6.358c0-4.774-3.234-7.568-6.886-7.568-4.576,0-7.216,3.344-7.216,8.03,0,4.51,3.08,7.568,6.886,7.568C-163.042.264-160.424-3.19-160.424-7.766Zm-3.1.418c0,3.322-1.5,4.994-3.828,4.994-2.75,0-4.07-1.782-4.07-5.412,0-3.08,1.606-4.906,3.828-4.906C-165.044-12.672-163.526-10.89-163.526-7.348Zm6.644-7.722h-.968V-2.046A1.859,1.859,0,0,0-155.87,0h.99V-7.612A51.947,51.947,0,0,0-150.04-.9a3.006,3.006,0,0,0,2.112.968,1.677,1.677,0,0,0,1.936-1.518,2.808,2.808,0,0,1-1.188-.616c-1.914-1.628-3.278-3.916-4.686-5.962a77.974,77.974,0,0,1,5.676-6.93v-.11h-2.068a2.345,2.345,0,0,0-2.288.924,46.332,46.332,0,0,0-4.334,5.808v-4.708A1.85,1.85,0,0,0-156.882-15.07ZM-141.2,0V-13.464A1.627,1.627,0,0,0-142.8-15.07h-1.364V-2a1.866,1.866,0,0,0,1.826,2Zm20.372,0c0-3.014-.44-9.57-.726-11.946-.242-2.068-1.342-3.124-3.014-3.124h-.352a10.513,10.513,0,0,0-2.354,4.422L-129.008-5.3a14.21,14.21,0,0,0-.418,1.54,19.9,19.9,0,0,0-.858-2.86l-2.09-5.9a4.03,4.03,0,0,0-4.136-2.552h-.638A98.7,98.7,0,0,0-138.358-2a1.81,1.81,0,0,0,1.892,2h1.056a93.108,93.108,0,0,1,.66-10.956c.22.528.572,1.43.836,2.2l2.156,6.358c.55,1.628,1.43,2.4,2.42,2.4h.814a11.029,11.029,0,0,0,1.232-2.684l2.112-6.468c.22-.682.506-1.3.7-1.782.242,1.5.572,7.018.572,8.932a1.79,1.79,0,0,0,1.936,2Zm13.244-2.816a15.134,15.134,0,0,1-3.3.33h-.968c-2.332,0-3.19-.506-3.19-3.124v-.88h3.982c1.21,0,1.826-.4,1.826-1.386V-8.954h-5.808a28.767,28.767,0,0,1,.22-3.52h5.17c1.386,0,2.024-.528,2.024-1.584V-15.07H-115.5c-1.232,0-2.068.462-2.31,2.266a31.7,31.7,0,0,0-.286,4.246v2.794c0,3.85,1.936,5.874,5.61,5.874h1.606c2.64,0,3.256-.66,3.278-1.87Zm3.1-12.254h-.968V-2.046A1.859,1.859,0,0,0-103.466,0h.99V-7.612A51.948,51.948,0,0,0-97.636-.9a3.006,3.006,0,0,0,2.112.968,1.677,1.677,0,0,0,1.936-1.518,2.808,2.808,0,0,1-1.188-.616C-96.69-3.7-98.054-5.984-99.462-8.03a77.972,77.972,0,0,1,5.676-6.93v-.11h-2.068a2.345,2.345,0,0,0-2.288.924,46.33,46.33,0,0,0-4.334,5.808v-4.708A1.85,1.85,0,0,0-104.478-15.07ZM-88.792,0V-13.464A1.627,1.627,0,0,0-90.4-15.07h-1.364V-2a1.866,1.866,0,0,0,1.826,2Zm19.25-4.664a3.75,3.75,0,0,0-2.662-3.3,3.1,3.1,0,0,0,2.4-3.19c0-2.464-2.046-3.982-4.928-3.982H-76.56a15.518,15.518,0,0,0-3.982.682V-3.52c0,2.354,1.386,3.586,4.2,3.586h1.628C-71.962.066-69.542-1.628-69.542-4.664ZM-72.82-10.89c0,1.3-1.1,1.826-2.442,1.826h-2.31v-3.41a9.439,9.439,0,0,1,1.3-.154h1.122C-74.03-12.628-72.82-12.21-72.82-10.89Zm.242,6.314c0,1.144-.792,1.892-2.42,1.892H-76.23c-.748,0-1.32-.418-1.32-.946v-3.1h2.4C-73.392-6.732-72.578-6.2-72.578-4.576Zm11.44,2.9V-2.31h-.792c-1.386,0-2-.374-2-1.562V-13.86a1.866,1.866,0,0,0-2.112-1.98h-.836V-3.586c0,2.4,1.32,3.7,3.762,3.7C-61.82.11-61.138-.4-61.138-1.672ZM-49.17-5.324V-9.768c0-1.386-.726-2.112-2.442-2.112h-.528v6.666c0,2.024-.858,2.86-2.068,2.86-1.342,0-2.4-.88-2.4-3.058V-9.768c0-1.386-.748-2.112-2.442-2.112h-.55v6.754A5.017,5.017,0,0,0-54.362.264C-50.908.264-49.17-1.628-49.17-5.324Zm13.09-2.222a4.586,4.586,0,0,0-4.752-4.6c-3.388,0-5.808,2.486-5.808,6.446A5.852,5.852,0,0,0-40.81.264c3.256,0,4.29-1.166,4.29-2.684v-.924h-.11a5.374,5.374,0,0,1-3.63,1.122,3.08,3.08,0,0,1-3.322-2.442h1.936C-37.73-4.664-36.08-5.368-36.08-7.546ZM-38.852-7.9c0,.836-.638,1.144-3.432,1.144H-43.6l.022-.4A2.536,2.536,0,0,1-41.1-9.68C-39.732-9.68-38.852-9.086-38.852-7.9ZM-25.058-3.74c0-1.892-1.32-2.97-3.784-3.366-2.024-.33-2.376-.572-2.376-1.166,0-.77.572-1.32,2.376-1.32a5.181,5.181,0,0,1,3.388,1.1h.11V-9.614c0-1.144-1.1-2.53-3.784-2.53-3.036,0-5.038,1.892-5.038,4.114,0,1.8,1.21,2.794,3.718,3.146,2.046.286,2.464.616,2.464,1.3,0,.88-.7,1.3-2.156,1.3A5.914,5.914,0,0,1-33.7-3.41h-.11v1.342c0,1.21,1.628,2.332,3.806,2.332C-26.818.264-25.058-1.232-25.058-3.74Zm3.564-12.1h-.946V-2.09C-22.44-.726-21.8,0-20.482,0h1.012V-5.808a50.588,50.588,0,0,0,4.136,5.06A2.892,2.892,0,0,0-13.4.066a1.814,1.814,0,0,0,2-1.452,4.986,4.986,0,0,1-2.288-1.54C-14.74-4-15.664-5.214-16.61-6.38a62.493,62.493,0,0,1,4.818-5.39v-.11h-1.694a3.042,3.042,0,0,0-2.354.77A31.729,31.729,0,0,0-19.47-6.8v-7.084A1.792,1.792,0,0,0-21.494-15.84ZM-2.948-2.552C-2.4-3.828-.33-9.24-.33-10.494c0-.968-.44-1.386-1.386-1.386H-2.992A33.427,33.427,0,0,1-5.3-3.652a25.529,25.529,0,0,1-2.376-6.842A1.722,1.722,0,0,0-9.394-11.88h-1.562A37.579,37.579,0,0,0-6.754-.836C-7.392.836-7.766,1.276-8.844,1.342l-1.672.11v.572A1.924,1.924,0,0,0-8.448,3.85C-6.314,3.85-5.148,2.64-2.948-2.552Z" transform="translate(1363 629.492)"/>
        <path id="heart" d="M17.088,4.736l-1.047-1.03A9.442,9.442,0,0,0,2.688,17.048l0-.005,14.4,14.4,14.4-14.421A9.443,9.443,0,0,0,18.13,3.69l.005,0L17.088,4.734Z" transform="translate(1128.952 605.221)" fill="var(--primary-color)"/>
      </g>
    </svg>
    </a></h1>

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
  }

  .header__title svg {
      width: 100%;
  }

  .header__notification {

  }

  .header__settings {
      margin-left: auto;
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

  .settings-box {
      position: absolute;
      top: 80px;
      right: 0;
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
</style>