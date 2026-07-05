<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { riceFx } from '$lib/rice/transition';
    import { cubicBezier } from '$lib/rice/easing';
    import Moon from '@lucide/svelte/icons/moon';
    import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
    import Puzzle from '@lucide/svelte/icons/puzzle';
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
    import { clickOutside } from '$lib/clickOutSide';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { quickActionRegistry } from '$lib/rice/modules/registries.svelte';
    import { setValueInText } from '$lib/rice/config/edit';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { isEffectiveDarkmode } from '$lib/commands/coreCommands';

    const expoOut = cubicBezier(0.16, 1, 0.3, 1);

    const darkmodeOn = $derived.by(() => {
        settingsStore.design.darkmode;
        return isEffectiveDarkmode();
    });

    function close() {
        overlayState.actionCenter = false;
    }

    function toggleModule(id: string, enable: boolean) {
        settingsStore.rice.config = setValueInText(
            settingsStore.rice.config,
            [{ name: 'module', label: id }],
            'enable',
            String(enable),
        );
    }
</script>

{#if overlayState.actionCenter}
    <div
        class="action-center"
        transition:riceFx={{ target: 'panel', duration: 220, easing: expoOut, style: { kind: 'slide', direction: 'top', distance: 12 } }}
        use:clickOutside={{ ignoreElement: '.rice-bar-item' }}
        onoutclick={close}
    >
        <h2 class="action-center__heading">{$_('action_center_title')}</h2>

        <div class="action-center__tiles">
            <button class="action-center-tile" class:action-center-tile--on={darkmodeOn} onclick={() => runCommand('darkmode.toggle')}>
                <Moon size={18}></Moon>
                <span>{$_('command_darkmode_toggle')}</span>
            </button>

            <button class="action-center-tile" class:action-center-tile--on={settingsStore.rice.enabled} onclick={() => runCommand('rice.toggle')}>
                <WandSparkles size={18}></WandSparkles>
                <span>{$_('command_rice_toggle')}</span>
            </button>

            {#each [...quickActionRegistry.entries()] as [id, action] (id)}
                {@const Icon = action.icon ?? Puzzle}
                <button
                    class="action-center-tile"
                    class:action-center-tile--on={action.kind === 'toggle' && (action.get?.() ?? false)}
                    onclick={() => action.run()}
                >
                    <Icon size={18}></Icon>
                    <span>{$_(action.title)}</span>
                </button>
            {/each}
        </div>

        <h3 class="action-center__subheading">{$_('action_center_modules')}</h3>

        <ul class="action-center__modules">
            {#each [...riceModuleHost.entries.values()] as entry (entry.manifest.id)}
                <li class="action-center-module">
                    <Puzzle size={16} color="var(--text-color-3)"></Puzzle>
                    <span class="action-center-module__name">{$_(entry.manifest.name)}</span>
                    {#if entry.status === 'error'}
                        <span class="action-center-module__error">{entry.errorMessage}</span>
                    {/if}
                    <div class="input-toggle">
                        <input
                            class="input-toggle__input"
                            type="checkbox"
                            id="ac-module-{entry.manifest.id}"
                            checked={entry.status === 'enabled' || entry.status === 'enabling'}
                            disabled={!settingsStore.rice.enabled}
                            onchange={(e) => toggleModule(entry.manifest.id, e.currentTarget.checked)}
                        ><label class="input-toggle__label" for="ac-module-{entry.manifest.id}"></label>
                    </div>
                </li>
            {/each}
        </ul>

        <button class="action-center__link" onclick={() => { close(); runCommand('settings.open', 'rice'); }}>
            <SlidersHorizontal size={16}></SlidersHorizontal>
            {$_('settings_rice')}
        </button>
    </div>
{/if}

<style lang="postcss">
    .action-center {
        position: fixed;
        top: calc(8px + var(--rice-statusbar-top-height, 0px));
        left: calc(var(--side-width, 64px) + 8px);
        z-index: 1010;
        width: 320px;
        max-height: calc(100dvh - 32px - var(--rice-statusbar-top-height, 0px) - var(--rice-statusbar-bottom-height, 0px));
        overflow-y: auto;
        padding: 16px;
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-4);
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        box-shadow: 0 12px 40px rgba(0, 0, 0, .2);

        @media (max-width: 767px) {
            left: 8px;
            right: 8px;
            width: auto;
        }
    }

    .action-center__heading {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 12px;
    }

    .action-center__subheading {
        font-size: 12px;
        color: var(--text-color-3);
        margin: 16px 0 8px;
    }

    .action-center__tiles {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .action-center-tile {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        padding: 10px;
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-3);
        background-color: var(--bg-color-2);
        color: var(--text-color-1);
        font-size: 12px;
        text-align: left;
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease), border-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);
    }

    .action-center-tile--on {
        border-color: var(--primary-color);
        background-color: var(--bg-color-1);
        color: var(--primary-color);
    }

    .action-center__modules {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .action-center-module {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
    }

    .action-center-module__name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .action-center-module__error {
        font-size: 11px;
        color: var(--danger-color);
    }

    .action-center__link {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 16px;
        color: var(--primary-color);
        font-size: 13px;
    }
</style>
