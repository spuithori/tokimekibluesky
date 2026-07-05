<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { tick, type Component } from 'svelte';
    import Plus from '@lucide/svelte/icons/plus';
    import Puzzle from '@lucide/svelte/icons/puzzle';
    import Terminal from '@lucide/svelte/icons/terminal';
    import Settings from '@lucide/svelte/icons/settings';
    import SearchX from '@lucide/svelte/icons/search-x';
    import ColumnIcon from '$lib/components/column/ColumnIcon.svelte';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
    import { listModuleColumnKinds, type ColumnKindDef } from '$lib/columnKindRegistry.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { animateLayout } from '$lib/animations/flip';
    import { fuzzyFilter } from '$lib/commands/fuzzy';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { riceFx } from '$lib/rice/transition';
    import {
        collectCommandEntries,
        collectSettingsEntries,
    } from '$lib/commands/paletteProviders';

    const columnState = getColumnState();

    let dialogEl = $state<HTMLDialogElement>();
    let query = $state('');
    let selectedIndex = $state(0);
    let tileEls: (HTMLElement | undefined)[] = $state([]);

    $effect(() => {
        if (overlayState.orbit && dialogEl) {
            dialogEl.showModal();
        }
    });

    function close() {
        overlayState.orbit = false;
        query = '';
        selectedIndex = 0;
    }

    function moduleTitle(def: ColumnKindDef): string {
        const moduleId = def.type.startsWith('module:') ? def.type.slice('module:'.length) : def.type;
        const manifest = riceModuleHost.entries.get(moduleId)?.manifest;
        return manifest ? $_(manifest.name) : moduleId;
    }

    interface OrbitTile {
        key: string;
        title: string;
        icon?: Component;
        columnType?: string;
        module?: boolean;
        run: () => void;
    }

    const columnTiles = $derived(columnState.slots.map((slot, index) => {
        const column = columnState.getSlotColumn(index);
        return {
            key: `column:${slot.id}`,
            title: column?.algorithm?.name ?? `#${index + 1}`,
            columnType: column?.algorithm?.type,
            run: () => runCommand('column.focus', String(index + 1)),
        } as OrbitTile;
    }));

    const moduleTiles = $derived(listModuleColumnKinds().map((def) => ({
        key: `module:${def.type}`,
        title: moduleTitle(def),
        module: true,
        run: () => {
            animateLayout(() => columnState.add({
                id: crypto.randomUUID(),
                algorithm: { type: def.type, name: moduleTitle(def) },
                style: 'default',
                did: '',
                settings: { ...defaultDeckSettings, width: 'medium' },
                data: { feed: [], cursor: '' },
            } as any));
        },
    } as OrbitTile)));

    const commandTiles = $derived(collectCommandEntries({ translate: $_ }).map((entry) => ({
        key: entry.key,
        title: entry.title,
        icon: entry.icon,
        run: entry.run,
    } as OrbitTile)));
    const settingsTiles = $derived(collectSettingsEntries({ translate: $_ }).map((entry) => ({
        key: entry.key,
        title: entry.title,
        run: entry.run,
    } as OrbitTile)));

    const filteredColumns = $derived(fuzzyFilter(query, columnTiles, (t) => t.title));
    const filteredModules = $derived(fuzzyFilter(query, moduleTiles, (t) => t.title));
    const filteredCommands = $derived(fuzzyFilter(query, commandTiles, (t) => t.title));
    const filteredSettings = $derived(fuzzyFilter(query, settingsTiles, (t) => t.title));

    const orbitSections = $derived.by(() => {
        const sections: { id: string; labelKey: string; tiles: OrbitTile[] }[] = [];
        const columns = query
            ? filteredColumns
            : [...filteredColumns, { key: 'orbit:add-column', title: $_('command_column_add'), run: () => runCommand('column.add') } as OrbitTile];
        if (columns.length) sections.push({ id: 'columns', labelKey: 'orbit_columns', tiles: columns });
        if (filteredModules.length) sections.push({ id: 'modules', labelKey: 'orbit_modules', tiles: filteredModules });
        if (filteredCommands.length) sections.push({ id: 'commands', labelKey: 'orbit_commands', tiles: filteredCommands });
        if (filteredSettings.length) sections.push({ id: 'settings', labelKey: 'orbit_settings', tiles: filteredSettings });
        return sections;
    });

    const flatTiles = $derived(orbitSections.flatMap((s) => s.tiles));
    const activeIndex = $derived(Math.min(selectedIndex, Math.max(flatTiles.length - 1, 0)));

    function flatIndexOf(sectionIdx: number, tileIdx: number): number {
        let index = 0;
        for (let i = 0; i < sectionIdx; i++) index += orbitSections[i].tiles.length;
        return index + tileIdx;
    }

    function execute(run: () => void) {
        close();
        run();
    }

    function scrollToSelected() {
        tick().then(() => {
            tileEls[activeIndex]?.scrollIntoView({ block: 'nearest' });
        });
    }

    function moveVertical(direction: 1 | -1) {
        const current = tileEls[activeIndex]?.getBoundingClientRect();
        if (!current) return;
        let best = -1;
        let bestRowDistance = Infinity;
        let bestXDistance = Infinity;
        const currentCenterX = current.left + current.width / 2;
        for (let i = 0; i < flatTiles.length; i++) {
            const rect = tileEls[i]?.getBoundingClientRect();
            if (!rect || i === activeIndex) continue;
            const isCandidate = direction === 1 ? rect.top > current.bottom - 1 : rect.bottom < current.top + 1;
            if (!isCandidate) continue;
            const rowDistance = direction === 1 ? rect.top - current.bottom : current.top - rect.bottom;
            const xDistance = Math.abs(rect.left + rect.width / 2 - currentCenterX);
            if (rowDistance < bestRowDistance - 1 || (Math.abs(rowDistance - bestRowDistance) <= 1 && xDistance < bestXDistance)) {
                best = i;
                bestRowDistance = rowDistance;
                bestXDistance = xDistance;
            }
        }
        if (best !== -1) {
            selectedIndex = best;
            scrollToSelected();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveVertical(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveVertical(-1);
        } else if (event.key === 'ArrowRight') {
            if (query && event.target instanceof HTMLInputElement) return;
            event.preventDefault();
            selectedIndex = Math.min(activeIndex + 1, flatTiles.length - 1);
            scrollToSelected();
        } else if (event.key === 'ArrowLeft') {
            if (query && event.target instanceof HTMLInputElement) return;
            event.preventDefault();
            selectedIndex = Math.max(activeIndex - 1, 0);
            scrollToSelected();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const tile = flatTiles[activeIndex];
            if (tile) execute(tile.run);
        }
    }

    function handleDialogClick(event: MouseEvent) {
        if (
            event.target === dialogEl ||
            (event.target instanceof HTMLElement && (event.target.classList.contains('orbit__scroll') || event.target.classList.contains('orbit__inner')))
        ) {
            close();
        }
    }

    function handleCancel(event: Event) {
        event.preventDefault();
        close();
    }
</script>

{#if overlayState.orbit}
    <dialog class="orbit" bind:this={dialogEl} onclose={close} oncancel={handleCancel} onclick={handleDialogClick} onkeydown={handleKeydown}>
        <div class="orbit__scroll">
        <div
            class="orbit__inner"
            transition:riceFx={{ target: 'modal', duration: 250, style: { kind: 'popin', scale: 0.97 } }}
        >
            <input
                class="orbit__search"
                type="text"
                bind:value={query}
                oninput={() => (selectedIndex = 0)}
                placeholder={$_('orbit_placeholder')}
                spellcheck="false"
                autocomplete="off"
            />

            {#each orbitSections as section, si (section.id)}
                <h2 class="orbit__heading">{$_(section.labelKey)}</h2>
                <div class="orbit__grid">
                    {#each section.tiles as tile, ti (tile.key)}
                        {@const i = flatIndexOf(si, ti)}
                        <button
                            class="orbit-tile"
                            class:orbit-tile--module={tile.module}
                            class:orbit-tile--selected={i === activeIndex}
                            bind:this={tileEls[i]}
                            onclick={() => execute(tile.run)}
                            onmouseenter={() => (selectedIndex = i)}
                        >
                            <span class="orbit-tile__icon">
                                {#if tile.columnType}
                                    <ColumnIcon type={tile.columnType} color="var(--text-color-1)"></ColumnIcon>
                                {:else if tile.key === 'orbit:add-column'}
                                    <Plus size={22}></Plus>
                                {:else if tile.module}
                                    <Puzzle size={22}></Puzzle>
                                {:else if tile.key.startsWith('settings:')}
                                    <Settings size={22}></Settings>
                                {:else if tile.icon}
                                    {@const Icon = tile.icon}
                                    <Icon size={22}></Icon>
                                {:else}
                                    <Terminal size={22}></Terminal>
                                {/if}
                            </span>
                            <span class="orbit-tile__title">{tile.title}</span>
                        </button>
                    {/each}
                </div>
            {/each}

            {#if flatTiles.length === 0}
                <div class="orbit__empty">
                    <SearchX size={28} color="var(--text-color-3)"></SearchX>
                    <p>{$_('orbit_no_results')}</p>
                </div>
            {/if}

            <p class="orbit__hint"><kbd>Ctrl/⌘</kbd>+<kbd>K</kbd> {$_('command_palette_toggle')}</p>
        </div>
        </div>
    </dialog>
{/if}

<style lang="postcss">
    .orbit {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        margin: 0;
        padding: 0;
        border: none;
        background-color: color-mix(in srgb, var(--base-bg-color, #000) 62%, transparent);
        backdrop-filter: blur(14px);
        color: var(--text-color-1);

        &::backdrop {
            background: transparent;
        }
    }

    .orbit__scroll {
        height: 100%;
        overflow-y: auto;
        overscroll-behavior-y: contain;

        @supports (-moz-appearance: none) {
            scrollbar-color: var(--scroll-bar-color) transparent;
            scrollbar-width: thin;
        }

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--scroll-bar-color);
            border-radius: 3px;
        }

        &::-webkit-scrollbar-track {
            background: transparent;
        }
    }

    .orbit__inner {
        max-width: 960px;
        margin: 0 auto;
        padding: clamp(48px, 10vh, 120px) 32px 96px;

        @media (max-width: 767px) {
            padding: 40px 20px 72px;
        }
    }

    .orbit__search {
        display: block;
        width: min(520px, 100%);
        margin: 0 auto 40px;
        padding: 14px 22px;
        border: 1px solid var(--border-color-1);
        border-radius: 28px;
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        font-size: 16px;
        outline: none;
        box-shadow: 0 8px 32px color-mix(in srgb, var(--base-dark-bg-color, #000) 18%, transparent);

        &::placeholder {
            color: var(--text-color-3);
        }

        &:focus {
            border-color: var(--primary-color);
        }
    }

    .orbit__heading {
        color: var(--text-color-3);
        font-size: 12px;
        font-weight: bold;
        letter-spacing: .08em;
        text-transform: uppercase;
        margin: 32px 0 14px;
    }

    .orbit__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 14px;
    }

    .orbit-tile {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px 8px;
        border-radius: var(--border-radius-4);
        border: 2px solid transparent;
        color: var(--text-color-1);
        text-align: center;
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--bg-color-2);
        }
    }

    .orbit-tile--selected {
        background-color: var(--bg-color-2);
        border-color: var(--primary-color);
    }

    .orbit-tile__icon {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background-color: var(--bg-color-1);
        border: 1px solid var(--border-color-2);
    }

    .orbit-tile__title {
        font-size: 12px;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .orbit__empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 48px 0;
        color: var(--text-color-3);
        font-size: 14px;
    }

    .orbit__hint {
        margin-top: 32px;
        text-align: center;
        color: var(--text-color-3);
        font-size: 12px;

        kbd {
            padding: 2px 6px;
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            background-color: var(--bg-color-1);
            font-family: inherit;
            font-size: 11px;
        }
    }
</style>
