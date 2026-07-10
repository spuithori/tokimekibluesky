<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import X from '@lucide/svelte/icons/x';
    import Check from '@lucide/svelte/icons/check';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';
    import { onClickOutside } from 'runed';
    import { languageMap } from '$lib/langs/languageMap';

    let {
        selected = $bindable<string[]>([]),
        excluded = $bindable<string[]>([]),
        negatable = false,
        placeholder = '',
        ariaLabel = undefined,
    }: {
        selected?: string[],
        excluded?: string[],
        negatable?: boolean,
        placeholder?: string,
        ariaLabel?: string,
    } = $props();

    let search = $state('');
    let isOpen = $state(false);
    let boxEl = $state<HTMLElement>();

    onClickOutside(() => boxEl, () => {
        isOpen = false;
    });

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            isOpen = false;
        }
    }

    const entries = [...languageMap] as [string, { name: string }][];

    let filtered = $derived.by(() => {
        const q = search.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter(([code, v]) =>
            code.toLowerCase().includes(q)
            || v.name.toLowerCase().includes(q)
            || $_(v.name).toLowerCase().includes(q)
        );
    });

    function toggle(code: string) {
        if (excluded.includes(code)) {
            excluded = excluded.filter(c => c !== code);
            selected = [...selected, code];
            return;
        }
        selected = selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code];
    }

    function remove(code: string, negated: boolean) {
        if (negated) {
            excluded = excluded.filter(c => c !== code);
        } else {
            selected = selected.filter(c => c !== code);
        }
    }

    function toggleNegate(code: string, negated: boolean) {
        if (negated) {
            excluded = excluded.filter(c => c !== code);
            if (!selected.includes(code)) {
                selected = [...selected, code];
            }
        } else {
            selected = selected.filter(c => c !== code);
            if (!excluded.includes(code)) {
                excluded = [...excluded, code];
            }
        }
    }
</script>

{#snippet chip(code: string, negated: boolean)}
    <li class={['lang-select__chip', negatable && 'lang-select__chip--togglable', negated && 'lang-select__chip--negated']}>
        {#if negatable}
            <button type="button" class="lang-select__negate" onclick={() => toggleNegate(code, negated)} aria-pressed={negated} title={$_('search_filter_exclude_toggle')} aria-label={$_('search_filter_exclude_toggle')}>
                {#if negated}
                    <Minus size="12" color="var(--danger-color)"></Minus>
                {:else}
                    <Plus size="12" color="var(--text-color-3)"></Plus>
                {/if}
            </button>
        {/if}
        <span>{$_(languageMap.get(code)?.name ?? code)}</span>
        <button type="button" class="lang-select__remove" onclick={() => remove(code, negated)} aria-label={$_('remove')}>
            <X size="14" color="var(--text-color-3)"></X>
        </button>
    </li>
{/snippet}

<div class="lang-select">
    {#if selected.length || excluded.length}
        <ul class="lang-select__chips">
            {#each selected as code (code)}
                {@render chip(code, false)}
            {/each}
            {#each excluded as code (code)}
                {@render chip(code, true)}
            {/each}
        </ul>
    {/if}

    <div class="lang-select__box" bind:this={boxEl}>
        <input type="text" class="lang-select__search" bind:value={search} {placeholder} aria-label={ariaLabel} autocomplete="off" onfocus={() => isOpen = true} onkeydown={handleKeydown}>

        {#if isOpen}
            <ul class="lang-select__list">
                {#each filtered as [code, v] (code)}
                    {@const isOn = selected.includes(code)}
                    <li>
                        <button type="button" class="lang-select__option" class:lang-select__option--on={isOn} aria-pressed={isOn} onclick={() => toggle(code)}>
                            <span class="lang-select__check">
                                {#if isOn}<Check size="16" color="var(--primary-color)"></Check>{/if}
                            </span>
                            <span class="lang-select__name">{$_(v.name)}</span>
                            <span class="lang-select__code">{code}</span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>

<style lang="postcss">
    .lang-select {
        display: flex;
        flex-direction: column;
        gap: 8px;

        &__chips {
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        &__chip {
            display: flex;
            align-items: center;
            gap: 6px;
            background-color: var(--bg-color-2);
            border: 1px solid var(--border-color-2);
            border-radius: 16px;
            padding: 4px 8px 4px 12px;
            font-size: 13px;

            &--togglable {
                padding-left: 4px;
            }

            &--negated {
                border-color: var(--danger-color);

                span:first-of-type {
                    text-decoration: line-through;
                }
            }
        }

        &__negate {
            display: grid;
            place-content: center;
            width: 18px;
            height: 18px;
            flex-shrink: 0;
            border-radius: 50%;
            border: 1px solid var(--border-color-2);

            &:hover {
                border-color: var(--primary-color);
            }
        }

        &__remove {
            display: grid;
            place-content: center;
        }

        &__search {
            height: 40px;
            padding: 0 16px;
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
            border-radius: var(--border-radius-3);
            width: 100%;
            outline: none;

            &:focus-visible {
                border-color: var(--primary-color);
            }
        }

        &__box {
            position: relative;
        }

        &__list {
            list-style: none;
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            right: 0;
            z-index: 10;
            max-height: 240px;
            overflow-y: auto;
            background-color: var(--bg-color-1);
            border: 1px solid var(--border-color-1);
            border-radius: var(--border-radius-3);
            box-shadow: 0 8px 24px var(--box-shadow-color-1);
        }

        &__option {
            display: grid;
            grid-template-columns: 20px 1fr auto;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 8px 12px;
            font-size: 14px;
            color: var(--text-color-1);
            text-align: left;

            &:hover {
                background-color: var(--bg-color-2);
            }

            &--on {
                background-color: var(--bg-color-2);
            }
        }

        &__check {
            display: grid;
            place-content: center;
            width: 20px;
            height: 20px;
        }

        &__code {
            font-size: 12px;
            color: var(--text-color-3);
            text-transform: uppercase;
        }
    }
</style>
