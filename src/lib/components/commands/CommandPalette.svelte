<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { tick } from 'svelte';
    import Orbit from '@lucide/svelte/icons/orbit';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { fuzzyMatch, toSegments, type HighlightSegment } from '$lib/commands/fuzzy';
    import { paletteRecency } from '$lib/commands/paletteRecency.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { riceFx } from '$lib/rice/transition';
    import {
        collectColumnEntries,
        collectCommandEntries,
        collectSettingsEntries,
        collectWorkspaceEntries,
        type PaletteEntry,
    } from '$lib/commands/paletteProviders';

    const columnState = getColumnState();
    const SECTION_LIMIT = 8;

    let dialogEl = $state<HTMLDialogElement>();
    let listEl = $state<HTMLElement>();
    let query = $state('');
    let selectedIndex = $state(0);
    let workspaceEntries = $state<PaletteEntry[]>([]);

    $effect(() => {
        if (overlayState.palette && dialogEl) {
            dialogEl.showModal();
            collectWorkspaceEntries().then((entries) => {
                workspaceEntries = entries;
            });
        }
    });

    interface RankedEntry {
        entry: PaletteEntry;
        segments: HighlightSegment[];
    }

    interface PaletteSection {
        id: string;
        labelKey: string;
        entries: RankedEntry[];
    }

    const orbitEntry: PaletteEntry = {
        key: 'command:orbit.toggle',
        title: '',
        hintKey: 'palette_hint_command',
        icon: Orbit,
        run: () => runCommand('orbit.toggle'),
    };

    const sections = $derived.by<PaletteSection[]>(() => {
        const groups: { id: string; labelKey: string; entries: PaletteEntry[] }[] = [
            { id: 'commands', labelKey: 'palette_hint_command', entries: collectCommandEntries({ translate: $_ }) },
            { id: 'columns', labelKey: 'palette_hint_column', entries: collectColumnEntries({ columnState }) },
            { id: 'settings', labelKey: 'palette_hint_settings', entries: collectSettingsEntries({ translate: $_ }) },
            { id: 'workspaces', labelKey: 'palette_hint_workspace', entries: workspaceEntries },
        ];
        const trimmed = query.trim();

        if (trimmed === '') {
            const all = new Map(groups.flatMap((g) => g.entries).map((e) => [e.key, e]));
            const recents: RankedEntry[] = paletteRecency.keys
                .map((key) => all.get(key))
                .filter((e): e is PaletteEntry => !!e)
                .slice(0, SECTION_LIMIT)
                .map((entry) => ({ entry, segments: [{ text: entry.title, hit: false }] }));
            const result: PaletteSection[] = [
                {
                    id: 'pinned',
                    labelKey: 'palette_hint_command',
                    entries: [{ entry: { ...orbitEntry, title: $_('palette_open_orbit') }, segments: [{ text: $_('palette_open_orbit'), hit: false }] }],
                },
            ];
            if (recents.length) {
                result.push({ id: 'recent', labelKey: 'palette_section_recent', entries: recents });
            }
            for (const group of groups) {
                const entries = group.entries.slice(0, SECTION_LIMIT).map((entry) => ({
                    entry,
                    segments: [{ text: entry.title, hit: false }] as HighlightSegment[],
                }));
                if (entries.length) result.push({ id: group.id, labelKey: group.labelKey, entries });
            }
            return result;
        }

        const result: PaletteSection[] = [];
        for (const group of groups) {
            const ranked = group.entries
                .map((entry) => ({ entry, match: fuzzyMatch(trimmed, entry.title) }))
                .filter((r): r is { entry: PaletteEntry; match: { score: number; positions: number[] } } => r.match !== null)
                .sort((a, b) => b.match.score - a.match.score)
                .slice(0, SECTION_LIMIT)
                .map(({ entry, match }) => ({ entry, segments: toSegments(entry.title, match.positions) }));
            if (ranked.length) result.push({ id: group.id, labelKey: group.labelKey, entries: ranked });
        }
        return result;
    });

    const flat = $derived(sections.flatMap((s) => s.entries));
    const activeIndex = $derived(Math.min(selectedIndex, Math.max(flat.length - 1, 0)));

    function flatIndexOf(sectionIdx: number, entryIdx: number): number {
        let index = 0;
        for (let i = 0; i < sectionIdx; i++) index += sections[i].entries.length;
        return index + entryIdx;
    }

    function close() {
        overlayState.palette = false;
        query = '';
        selectedIndex = 0;
        workspaceEntries = [];
    }

    function execute(entry: PaletteEntry) {
        paletteRecency.record(entry.key);
        close();
        entry.run();
    }

    function scrollToSelected() {
        tick().then(() => {
            listEl?.querySelector('.command-palette__item--selected')?.scrollIntoView({ block: 'nearest' });
        });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = Math.min(activeIndex + 1, flat.length - 1);
            scrollToSelected();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = Math.max(activeIndex - 1, 0);
            scrollToSelected();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const ranked = flat[activeIndex];
            if (ranked) execute(ranked.entry);
        }
    }

    function handleDialogClick(event: MouseEvent) {
        if (event.target === dialogEl) {
            close();
        }
    }

    function handleCancel(event: Event) {
        event.preventDefault();
        close();
    }
</script>

{#if overlayState.palette}
    <dialog
        class="command-palette"
        bind:this={dialogEl}
        onclose={close}
        oncancel={handleCancel}
        onclick={handleDialogClick}
    >
        <div
            class="command-palette__box"
            transition:riceFx={{ target: 'modal', duration: 250, style: { kind: 'popin', scale: 0.97 } }}
        >
            <input
                class="command-palette__input"
                type="text"
                bind:value={query}
                oninput={() => (selectedIndex = 0)}
                onkeydown={handleKeydown}
                placeholder={$_('palette_placeholder')}
                spellcheck="false"
                autocomplete="off"
            />

            <div class="command-palette__list" bind:this={listEl}>
                {#each sections as section, si (section.id)}
                    <h3 class="command-palette__section">{$_(section.labelKey)}</h3>
                    <ul>
                        {#each section.entries as ranked, ei (ranked.entry.key)}
                            {@const i = flatIndexOf(si, ei)}
                            <li class="command-palette__item" class:command-palette__item--selected={i === activeIndex}>
                                <button class="command-palette__button" onclick={() => execute(ranked.entry)} onmouseenter={() => (selectedIndex = i)}>
                                    {#if ranked.entry.icon}
                                        {@const Icon = ranked.entry.icon}
                                        <span class="command-palette__icon"><Icon size={16} strokeWidth="var(--icon-stroke-width, 2px)"></Icon></span>
                                    {:else}
                                        <span class="command-palette__icon command-palette__icon--empty"></span>
                                    {/if}
                                    <span class="command-palette__title">
                                        {#each ranked.segments as segment}
                                            {#if segment.hit}<mark>{segment.text}</mark>{:else}{segment.text}{/if}
                                        {/each}
                                    </span>
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/each}

                {#if flat.length === 0}
                    <p class="command-palette__empty">{$_('palette_no_results')}</p>
                {/if}
            </div>
        </div>
    </dialog>
{/if}

<style lang="postcss">
    .command-palette {
        position: fixed;
        top: 15vh;
        left: 0;
        right: 0;
        margin: 0 auto;
        width: min(560px, calc(100vw - 32px));
        padding: 0;
        border: none;
        background: transparent;
        color: var(--text-color-1);

        &::backdrop {
            background-color: rgba(0, 0, 0, .35);
        }
    }

    .command-palette__box {
        border: var(--rice-panel-border, 1px solid var(--border-color-1));
        border-radius: var(--rice-panel-rounding, var(--border-radius-4));
        background-color: var(--rice-panel-bg, var(--bg-color-1));
        box-shadow: var(--rice-panel-shadow, 0 16px 48px rgba(0, 0, 0, .25));
        overflow: hidden;
    }

    .command-palette__input {
        width: 100%;
        padding: 14px 16px;
        border: none;
        border-bottom: 1px solid var(--border-color-1);
        background: transparent;
        color: var(--text-color-1);
        font-size: 15px;
        outline: none;

        &::placeholder {
            color: var(--text-color-3);
        }
    }

    .command-palette__list {
        max-height: 380px;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        padding: 6px;

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

        ul {
            list-style: none;
        }
    }

    .command-palette__section {
        padding: 8px 10px 4px;
        color: var(--text-color-3);
        font-size: 11px;
        font-weight: bold;
        letter-spacing: .06em;
        text-transform: uppercase;
    }

    .command-palette__button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px 10px;
        border-radius: var(--border-radius-2);
        color: var(--text-color-1);
        text-align: left;
        font-size: 14px;
    }

    .command-palette__item--selected .command-palette__button {
        background-color: var(--bg-color-2);
    }

    .command-palette__icon {
        flex-shrink: 0;
        display: grid;
        place-content: center;
        width: 18px;
        color: var(--text-color-2);
    }

    .command-palette__title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        mark {
            background: transparent;
            color: var(--primary-color);
            font-weight: bold;
        }
    }

    .command-palette__empty {
        padding: 16px;
        text-align: center;
        color: var(--text-color-3);
        font-size: 13px;
    }
</style>
