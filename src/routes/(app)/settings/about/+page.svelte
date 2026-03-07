<script lang="ts">
    import {_} from 'svelte-i18n';
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    import { onMount } from 'svelte';
    import { agent } from "$lib/stores";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    let me = $state();

    onMount(async () => {
        const res = await $agent.xrpcGet('app.bsky.actor.getProfile', {actor: 'holybea.blue'});
        me = res.data;
    })
</script>

<svelte:head>
  <title>{$_('settings_about')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_about')}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="about-subhead">{$_('about_subhead')}</p>

    <h2 class="about-logo">
      <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="235.202" height="45.781" viewBox="0 0 235.202 45.781" aria-label="TOKIMEKI">
        <defs>
          <linearGradient id="linear-gradient" x1="0.5" x2="0.5" y2="1" gradientUnits="objectBoundingBox">
            <stop offset="0" stop-color="#caecee"/>
            <stop offset="1" stop-color="#8c56d3"/>
          </linearGradient>
          <clipPath id="clip-path">
            <rect id="長方形_206" data-name="長方形 206" width="63.409" height="45.781" transform="translate(1655.528 380.327)" fill="url(#linear-gradient)"/>
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
        <g id="グループ_172" data-name="グループ 172" transform="translate(-3937 -533.636)">
          <g id="マスクグループ_11" data-name="マスクグループ 11" transform="translate(2281.472 153.309)" clip-path="url(#clip-path)">
            <g id="グループ_131" data-name="グループ 131" transform="translate(1655.528 380.327)">
              <circle id="楕円形_52" data-name="楕円形 52" cx="31.705" cy="31.705" r="31.705" transform="translate(0 0)" opacity="0.61" fill="url(#linear-gradient-2)"/>
              <path id="パス_65" data-name="パス 65" d="M25.3,0A25.3,25.3,0,1,1,0,25.3,25.3,25.3,0,0,1,25.3,0Z" transform="translate(6.439 9.038)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_53" data-name="楕円形 53" cx="18.88" cy="18.88" r="18.88" transform="translate(12.824 18.131)" fill="url(#linear-gradient-3)"/>
              <circle id="楕円形_54" data-name="楕円形 54" cx="12.646" cy="12.646" r="12.646" transform="translate(19.237 27.196)" fill="#fff"/>
            </g>
          </g>
          <path id="パス_104" data-name="パス 104" d="M11.1,1.68a.8.8,0,0,0,.9-.9l.3-16.95,5.49-.06a.992.992,0,0,0,1.05-1.05v-2.46a.992.992,0,0,0-1.05-1.05L1.5-20.76A.992.992,0,0,0,.45-19.71v2.46A.992.992,0,0,0,1.5-16.2l5.49.03L7.26.78a.8.8,0,0,0,.9.9Zm21.24.3c6.42,0,10.74-4.74,10.74-11.52s-4.32-11.7-10.74-11.7c-6.45,0-10.8,4.92-10.8,11.7S25.89,1.98,32.34,1.98Zm.27-4.71c-3.06,0-5.67-2.37-5.67-6.51s2.52-6.54,5.67-6.54c3.03,0,5.67,2.4,5.67,6.54S35.64-2.73,32.61-2.73ZM65.58.06c.51-.36.93-.69.54-1.23l-6.78-9.78,6.54-7.11c.3-.33.3-.78-.24-1.14l-2.97-2.22c-.54-.36-.87.03-1.32.54l-7.62,9.21.12-8.22a.763.763,0,0,0-.87-.9H49.2c-.6,0-.87.3-.87.9L48.69.78a.8.8,0,0,0,.9.9h3.06a.8.8,0,0,0,.9-.9l.06-5.55L55.8-7.11l6.09,8.34c.45.51.66.81,1.26.6Zm9.51,1.62a.8.8,0,0,0,.9-.9l.3-20.67a.763.763,0,0,0-.87-.9H71.76c-.6,0-.87.3-.87.9L71.25.78a.8.8,0,0,0,.9.9Zm27.84-.03a.8.8,0,0,0,.9-.9l.36-20.34a1.167,1.167,0,0,0-1.2-1.2H99.36a1.856,1.856,0,0,0-1.47.9L93.18-6.81,88.47-19.89a1.856,1.856,0,0,0-1.47-.9H83.37a1.167,1.167,0,0,0-1.2,1.2L82.53.75a.8.8,0,0,0,.9.9h2.64a.8.8,0,0,0,.9-.9l.21-12.39L90.96.21a1.058,1.058,0,0,0,1.11.84h2.19A1.089,1.089,0,0,0,95.4.21l3.78-11.85L99.39.75a.8.8,0,0,0,.9.9Zm24-4.38c-.09-.54-.36-.72-.99-.6a54.4,54.4,0,0,1-10.41.72l-.03-4.56,9.54-.09a.992.992,0,0,0,1.05-1.05v-2.46a.992.992,0,0,0-1.05-1.05l-9.54.18v-4.47l10.74-.15a.992.992,0,0,0,1.05-1.05v-2.46a.992.992,0,0,0-1.05-1.05l-14.07.06a1.911,1.911,0,0,0-2.1,2.1l.36,18.57a1.9,1.9,0,0,0,2.1,2.07A61.7,61.7,0,0,0,126.75.81c.51-.12.75-.42.63-1.05ZM149.49.06c.51-.36.93-.69.54-1.23l-6.78-9.78,6.54-7.11c.3-.33.3-.78-.24-1.14l-2.97-2.22c-.54-.36-.87.03-1.32.54l-7.62,9.21.12-8.22a.763.763,0,0,0-.87-.9h-3.78c-.6,0-.87.3-.87.9L132.6.78a.8.8,0,0,0,.9.9h3.06a.8.8,0,0,0,.9-.9l.06-5.55,2.19-2.34,6.09,8.34c.45.51.66.81,1.26.6ZM159,1.68a.8.8,0,0,0,.9-.9l.3-20.67a.763.763,0,0,0-.87-.9h-3.66c-.6,0-.87.3-.87.9L155.16.78a.8.8,0,0,0,.9.9Z" transform="translate(4012 566)" fill="var(--text-color-1)"/>
        </g>
      </svg>
    </h2>

    <div class="about-content">
      <p class="about-text">{$_('about_text1')}</p>
      <p class="about-text">{$_('about_text2')}: <a href="https://github.com/spuithori/tokimekibluesky" target="_blank" rel="noopener">GitHub</a></p>

      <div class="about-author">
        <h3 class="about-title">{$_('author')}</h3>

        {#if (me)}
          <UserItem user={me}></UserItem>
        {/if}

        <h3 class="about-title">{$_('donation')}</h3>

        <div class="mb10">
          <a href="https://www.buymeacoffee.com/spuithori" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
        </div>

        <div>
          <a href="https://tokimeki.fanbox.cc/" target="_blank"><img src="/fanbox.png" alt="PIXIV FANBOX" style="height: 60px !important;width: 217px !important;" ></a>
        </div>

        <p class="about-pp"><a href="https://docs.tokimeki.blue/" target="_blank" rel="noopener">{$_('document')}</a></p>

        <p class="about-pp"><a href="https://docs.tokimeki.blue/privacy" target="_blank" rel="noopener">{$_('privacy_policy')}</a></p>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
    .about-subhead {
        font-weight: 900;
        font-size: 18px;
        text-align: center;
        margin-bottom: 15px;
    }

    .about-logo {
        text-align: center;
        margin-bottom: 25px;

        svg {
            display: inline-block;
        }
    }

    .about-text {
        line-height: 1.75;
        white-space: pre-line;

        &:not(:last-child) {
            margin-bottom: 1em;
        }
    }

    .about-title {
        margin: 10px 0;
    }

    .about-pp {
        margin-top: 20px;
    }
</style>