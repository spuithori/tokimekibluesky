<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { liveQuery } from 'dexie';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { builtInThemes } from '$lib/builtInThemes';
    import { themesDb } from '$lib/db';

    const myThemes = liveQuery(async () => await themesDb.themes.toArray());
</script>

<div class="icons-radio-group icons-radio-group--grid">
    {#each builtInThemes as _skin (_skin.id)}
        <div class="icons-radio icons-radio--skin">
            <input type="radio" bind:group={settingsStore.design.skin} id="skin_{_skin.id}" name="skin" value={_skin.name} />
            <label for="skin_{_skin.id}">
                <span class="icons-radio__ui">
                    <img src={_skin.options?.thumbnail} alt="" />
                </span>{$_('skin_' + _skin.name)}
            </label>
        </div>
    {/each}

    {#if $myThemes}
        {#each $myThemes as _skin (_skin.id)}
            <div class="icons-radio icons-radio--skin icons-radio--skin-dl">
                <input type="radio" bind:group={settingsStore.design.skin} id="skin_{_skin.id}" name="skin" value={_skin.id} />
                <label for="skin_{_skin.id}">
                    <span class="icons-radio__ui">
                        <img src={_skin.options?.thumbnail} alt="" />
                    </span>{_skin.name}
                </label>
            </div>
        {/each}
    {/if}
</div>

<p class="theme-store-link"><a href="/theme-store"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>{$_('theme_store')}</a></p>

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
