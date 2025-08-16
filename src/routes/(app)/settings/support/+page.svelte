<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
</script>

<svelte:head>
    <title>{m.settings_about()} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>
        {m.settings_about()}
    </SettingsHeader>

    <div class="settings-wrap">
        <div class="about-content">
            <p class="about-text">{m.support_text_1()}</p>

            <h3 class="about-title text-center">{m.donation()}</h3>

            <ul class="support-banner-list">
                <li class="support-banner-list__item">
                    <a href="https://tokimeki.fanbox.cc/" target="_blank"><img src="/fanbox.png" alt="PIXIV FANBOX" style="width: 240px !important;" ></a>
                </li>

                <li class="support-banner-list__item">
                    <a href="https://patreon.com/TOKIMEKI" target="_blank"><img src="/patreon.svg" alt="Patreon" style="height: 60px !important;width: 217px !important;"></a>
                </li>

                <li class="support-banner-list__item">
                    <a href="https://www.buymeacoffee.com/spuithori" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>
                </li>
            </ul>

            <h3 class="about-title text-center">{m.sponsor()}</h3>
            <ul class="sponsor-list">

            </ul>
        </div>
    </div>
</div>

<style lang="postcss">
    .about-text {
        line-height: 1.75;
        white-space: pre-line;
        margin-bottom: 24px;
    }

    .about-title {
        margin: 10px 0;
    }

   .support-banner-list {
       display: flex;
       flex-direction: column;
       align-items: center;
       list-style: none;
       gap: 8px;
       margin-bottom: 24px;
   }
</style>