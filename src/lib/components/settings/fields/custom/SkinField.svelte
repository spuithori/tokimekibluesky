<script lang="ts">
    import Palette from '@lucide/svelte/icons/palette';
    import { _ } from 'tokimeki-i18n';
    import { liveQuery } from 'dexie';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { BUILTIN_THEMES } from '$lib/theme/installed';
    import { previewSrc } from '$lib/theme/preview';
    import { themesDb } from '$lib/db';

    const myThemes = liveQuery(async () => await themesDb.themes.toArray());
</script>

<div class="icons-radio-group icons-radio-group--grid">
    {#each BUILTIN_THEMES as _skin (_skin.id)}
        <div class="icons-radio icons-radio--skin">
            <input type="radio" bind:group={settingsStore.design.skin} id="skin_{_skin.id}" name="skin" value={_skin.id} />
            <label for="skin_{_skin.id}">
                <span class="icons-radio__ui">
                    <img {@attach previewSrc(undefined, _skin.previewUrl)} alt="" />
                </span>{$_('skin_' + _skin.record.name)}
            </label>
        </div>
    {/each}

    {#if $myThemes}
        {#each $myThemes as _skin (_skin.id)}
            <div class="icons-radio icons-radio--skin icons-radio--skin-dl">
                <input type="radio" bind:group={settingsStore.design.skin} id="skin_{_skin.id}" name="skin" value={_skin.id} />
                <label for="skin_{_skin.id}">
                    <span class="icons-radio__ui">
                        <img {@attach previewSrc(_skin.thumbnail, _skin.previewUrl)} alt="" />
                    </span>{_skin.record.name}
                </label>
            </div>
        {/each}
    {/if}
</div>

<p class="theme-store-link"><a href="/theme-store"><Palette size={20} color="var(--primary-color)" />{$_('theme_store')}</a></p>

<style lang="postcss">
    .theme-store-link {
        margin-top: 16px;

        a {
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
    }
</style>
