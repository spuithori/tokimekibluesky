<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { X, Check } from 'lucide-svelte';
    import { languageMap } from '$lib/langs/languageMap';

    let {
        selected = $bindable<string[]>([]),
        placeholder = '',
    }: {
        selected?: string[],
        placeholder?: string,
    } = $props();

    let search = $state('');

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
        selected = selected.includes(code) ? selected.filter(c => c !== code) : [...selected, code];
    }
</script>

<div class="lang-select">
    {#if selected.length}
        <ul class="lang-select__chips">
            {#each selected as code (code)}
                <li class="lang-select__chip">
                    <span>{$_(languageMap.get(code)?.name ?? code)}</span>
                    <button type="button" class="lang-select__remove" onclick={() => toggle(code)} aria-label="Remove">
                        <X size="14" color="var(--text-color-3)"></X>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}

    <input type="text" class="lang-select__search" bind:value={search} {placeholder} autocomplete="off">

    <ul class="lang-select__list">
        {#each filtered as [code, v] (code)}
            {@const isOn = selected.includes(code)}
            <li>
                <button type="button" class="lang-select__option" class:lang-select__option--on={isOn} onclick={() => toggle(code)}>
                    <span class="lang-select__check">
                        {#if isOn}<Check size="16" color="var(--primary-color)"></Check>{/if}
                    </span>
                    <span class="lang-select__name">{$_(v.name)}</span>
                    <span class="lang-select__code">{code}</span>
                </button>
            </li>
        {/each}
    </ul>
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

        &__list {
            list-style: none;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border-color-1);
            border-radius: var(--border-radius-3);
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
