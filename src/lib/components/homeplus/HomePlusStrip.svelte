<script lang="ts">
    import { _, getLocale } from 'tokimeki-i18n';
    import Check from '@lucide/svelte/icons/check';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import ChevronUp from '@lucide/svelte/icons/chevron-up';
    import Plus from '@lucide/svelte/icons/plus';
    import X from '@lucide/svelte/icons/x';
    import Menu from '$lib/components/ui/Menu.svelte';
    import {
        HOME_PLUS_GROUPS,
        SORT_CHOICES,
        addableConds,
        condLabel,
        defaultCond,
        isNegatable,
        sortLabel,
        valueChoices,
        type HomePlusCond,
        type HomePlusCondId,
        type HomePlusRecipe,
        type HomePlusSort,
    } from '$lib/homeplus/recipe';

    interface Props {
        recipe: HomePlusRecipe;
        saving?: boolean;
        onchange: (next: HomePlusRecipe) => void;
        onclose: () => void;
    }

    let { recipe, saving = false, onchange, onclose }: Props = $props();

    let openMenu = $state<string | null>(null);
    let keywordMode = $state(false);
    let keyword = $state('');

    const addable = $derived(addableConds(recipe));
    const addableGroups = $derived(HOME_PLUS_GROUPS
        .map(group => ({ group, items: addable.filter(item => item.group === group) }))
        .filter(entry => entry.items.length > 0));

    function hasOptions(cond: HomePlusCond): boolean {
        return !!valueChoices(cond.id) || isNegatable(cond.id);
    }

    function optionsOf(cond: HomePlusCond): HomePlusCond[] {
        const choices = valueChoices(cond.id);
        if (choices) {
            return choices.map(value => ({ id: cond.id, value }));
        }
        return [{ ...cond, negated: false }, { ...cond, negated: true }];
    }

    function isSame(a: HomePlusCond, b: HomePlusCond): boolean {
        return a.value === b.value && !!a.negated === !!b.negated;
    }

    function commit(conds: HomePlusCond[], sort: HomePlusSort = recipe.sort) {
        openMenu = null;
        keywordMode = false;
        keyword = '';
        onchange({ conds, sort });
    }

    function replace(index: number, cond: HomePlusCond) {
        if (isSame(recipe.conds[index], cond)) {
            openMenu = null;
            return;
        }
        commit(recipe.conds.map((entry, i) => (i === index ? cond : entry)));
    }

    function remove(index: number) {
        commit(recipe.conds.filter((_cond, i) => i !== index));
    }

    function add(id: HomePlusCondId) {
        if (id === 'keyword') {
            keywordMode = true;
            return;
        }
        commit([...recipe.conds, defaultCond(id, getLocale() ?? 'en')]);
    }

    function addKeyword(event: SubmitEvent) {
        event.preventDefault();
        const value = keyword.trim();
        if (value) {
            commit([...recipe.conds, { id: 'keyword', value }]);
        }
    }

    function focusInput(node: HTMLInputElement) {
        node.focus();
    }

    function setSort(sort: HomePlusSort) {
        if (sort === recipe.sort) {
            openMenu = null;
            return;
        }
        commit(recipe.conds, sort);
    }
</script>

<div class={['homeplus-strip', { 'homeplus-strip--saving': saving }]} inert={saving}>
    <div class="homeplus-strip__chips">
        {#each recipe.conds as cond, index (index)}
            <span class="homeplus-chip">
                {#if hasOptions(cond)}
                    <Menu
                        bind:isMenuOpen={() => openMenu === `cond${index}`, (open) => { openMenu = open ? `cond${index}` : null; }}
                        buttonClassName="homeplus-chip__label homeplus-chip__label--menu"
                        position="bottom-start"
                        label={condLabel(cond, $_)}
                    >
                        {#snippet ref()}
                            <span class="homeplus-chip__text">{condLabel(cond, $_)}</span>
                            <ChevronDown size={14}></ChevronDown>
                        {/snippet}

                        {#snippet content()}
                            <ul class="timeline-menu-list">
                                {#each optionsOf(cond) as option (`${option.value}${option.negated}`)}
                                    <li class="timeline-menu-list__item">
                                        <button class="timeline-menu-list__button" aria-pressed={isSame(cond, option)} onclick={() => replace(index, option)}>
                                            <span class="menu-check">
                                                {#if isSame(cond, option)}
                                                    <Check size={16}></Check>
                                                {/if}
                                            </span>
                                            <span>{condLabel(option, $_)}</span>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        {/snippet}
                    </Menu>
                {:else}
                    <span class="homeplus-chip__label">
                        <span class="homeplus-chip__text">{condLabel(cond, $_)}</span>
                    </span>
                {/if}

                <button class="homeplus-chip__remove" type="button" onclick={() => remove(index)} aria-label="{$_('homeplus_remove_cond')}: {condLabel(cond, $_)}">
                    <X size={14}></X>
                </button>
            </span>
        {/each}

        {#if addableGroups.length}
            <Menu
                bind:isMenuOpen={() => openMenu === 'add', (open) => { openMenu = open ? 'add' : null; keywordMode = false; keyword = ''; }}
                buttonClassName="homeplus-add"
                position="bottom-start"
                label={$_('homeplus_add_cond')}
            >
                {#snippet ref()}
                    <Plus size={16} strokeWidth={2.5}></Plus>
                    <span>{$_('homeplus_add_cond')}</span>
                {/snippet}

                {#snippet content()}
                    {#if keywordMode}
                        <form class="homeplus-keyword" onsubmit={addKeyword}>
                            <input class="homeplus-keyword__input" type="text" bind:value={keyword} placeholder={$_('homeplus_keyword_placeholder')} aria-label={$_('homeplus_m_keyword')} autocomplete="off" {@attach focusInput}>
                            <button class="button button--ss" type="submit" disabled={!keyword.trim()}>{$_('homeplus_add')}</button>
                        </form>
                    {:else}
                        {#each addableGroups as entry (entry.group)}
                            <p class="homeplus-menu-group">{$_(`homeplus_g_${entry.group}`)}</p>
                            <ul class="timeline-menu-list">
                                {#each entry.items as item (item.id)}
                                    <li class="timeline-menu-list__item">
                                        <button class="timeline-menu-list__button" data-homeplus-cond={item.id} onclick={() => add(item.id)}>{$_(item.menuKey)}</button>
                                    </li>
                                {/each}
                            </ul>
                        {/each}
                    {/if}
                {/snippet}
            </Menu>
        {/if}
    </div>

    <div class="homeplus-strip__foot">
        <Menu
            bind:isMenuOpen={() => openMenu === 'sort', (open) => { openMenu = open ? 'sort' : null; }}
            buttonClassName="homeplus-sort"
            position="bottom-start"
            label={sortLabel(recipe.sort, $_)}
        >
            {#snippet ref()}
                <span>{sortLabel(recipe.sort, $_)}</span>
                {#if recipe.sort !== 'new'}
                    <span class="homeplus-sort__window">{$_('homeplus_sort_window')}</span>
                {/if}
                <ChevronDown size={14}></ChevronDown>
            {/snippet}

            {#snippet content()}
                <ul class="timeline-menu-list">
                    {#each SORT_CHOICES as sort (sort)}
                        <li class="timeline-menu-list__item">
                            <button class="timeline-menu-list__button" data-homeplus-sort={sort} aria-pressed={recipe.sort === sort} onclick={() => setSort(sort)}>
                                <span class="menu-check">
                                    {#if recipe.sort === sort}
                                        <Check size={16}></Check>
                                    {/if}
                                </span>
                                <span>{sortLabel(sort, $_)}</span>
                                {#if sort !== 'new'}
                                    <span class="homeplus-sort__window">{$_('homeplus_sort_window')}</span>
                                {/if}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/snippet}
        </Menu>

        <button class="homeplus-strip__close" type="button" onclick={onclose} aria-label={$_('close')}>
            <ChevronUp size={18}></ChevronUp>
        </button>
    </div>
</div>

<style lang="postcss">
    .homeplus-strip {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px 12px 12px;
        border-bottom: 1px solid var(--deck-border-color);
        background: var(--deck-heading-bg-color);
        transition: opacity .15s ease;

        &--saving {
            opacity: .55;
        }
    }

    .homeplus-strip__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .homeplus-chip {
        display: inline-flex;
        align-items: stretch;
        max-width: 100%;
        height: 32px;
        border-radius: var(--radius-round, 16px);
        border: 1px solid color-mix(in srgb, var(--primary-color) 38%, var(--border-color-1));
        background-color: color-mix(in srgb, var(--primary-color) 10%, var(--bg-color-1));
        color: var(--text-color-1);
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
    }

    .homeplus-chip :global(.homeplus-chip__label),
    .homeplus-chip__label {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        min-width: 0;
        padding: 0 4px 0 12px;
        color: inherit;
        font: inherit;
    }

    .homeplus-chip :global(.homeplus-chip__label--menu:hover),
    .homeplus-chip__remove:hover {
        background-color: var(--state-hover, var(--bg-color-2));
    }

    .homeplus-strip :global(.timeline-menu) {
        max-height: min(70dvh, 560px);
        overflow-y: auto;
        overscroll-behavior: contain;
        font-weight: 400;
    }

    .homeplus-chip__text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .homeplus-chip__remove {
        flex-shrink: 0;
        display: grid;
        place-items: center;
        width: 28px;
        color: var(--text-color-3);
    }

    .homeplus-strip :global(.homeplus-add) {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 12px 0 8px;
        border-radius: var(--radius-round, 16px);
        border: 1.5px solid var(--primary-color);
        color: var(--primary-color);
        font-size: 13px;
        font-weight: 700;
        transition: background-color .15s ease, color .15s ease;

        &:hover {
            background-color: var(--primary-color);
            color: var(--on-accent, var(--bg-color-1));
        }
    }

    .homeplus-strip__foot {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .homeplus-strip :global(.homeplus-sort) {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 32px;
        padding: 0 10px;
        margin-left: -10px;
        border-radius: var(--radius-control, var(--border-radius-3));
        color: var(--text-color-1);
        font-size: 13px;
        font-weight: 700;

        &:hover {
            background-color: var(--state-hover, var(--bg-color-2));
        }
    }

    .homeplus-sort__window {
        color: var(--text-color-3);
        font-size: 12px;
        font-weight: 400;
    }

    .homeplus-strip__close {
        margin-left: auto;
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-round, 50%);
        color: var(--text-color-3);

        &:hover {
            background-color: var(--state-hover, var(--bg-color-2));
        }
    }

    .homeplus-menu-group {
        padding: 8px 16px 2px;
        color: var(--text-color-3);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .04em;
    }

    .homeplus-keyword {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
    }

    .homeplus-keyword__input {
        flex: 1;
        min-width: 0;
        width: 160px;
        height: 34px;
        padding: 0 8px;
        border-radius: var(--border-radius-3);
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        font-size: 14px;
    }
</style>
