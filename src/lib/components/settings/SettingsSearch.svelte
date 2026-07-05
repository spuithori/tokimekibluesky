<script lang="ts">
    import { _, locale } from "tokimeki-i18n";
    import { goto } from "$app/navigation";
    import Search from '@lucide/svelte/icons/search';
    import {
        buildIndex,
        searchSettings,
        type SearchResult,
    } from "$lib/settings/search.svelte";

    let query = $state("");
    let selectedIndex = $state(0);

    const index = $derived.by(() => {
        void $locale; // rebuild on locale change
        return buildIndex(
            (key) => $_(key),
            (key) => $_(key, { locale: "en" }),
        );
    });
    const results = $derived(searchSettings(index, query));

    function navigate(result: SearchResult) {
        query = "";
        goto(
            result.hash
                ? `${result.route}#${encodeURIComponent(result.hash)}`
                : result.route,
        );
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!results.length) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % results.length;
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            selectedIndex =
                (selectedIndex - 1 + results.length) % results.length;
        } else if (event.key === "Enter") {
            event.preventDefault();
            const result = results[selectedIndex];
            if (result) {
                navigate(result);
            }
        } else if (event.key === "Escape") {
            query = "";
        }
    }
</script>

<div class="settings-search">
    <Search class="settings-search__icon" size="18" color="var(--text-color-3)"
    ></Search>
    <input
        class="settings-search__input"
        type="search"
        bind:value={query}
        placeholder={$_("settings_search_placeholder")}
        onkeydown={handleKeydown}
        oninput={() => (selectedIndex = 0)}
        aria-label={$_("settings_search_placeholder")}
    />
</div>

{#if query.trim()}
    <ul class="settings-search__results">
        {#each results as result, i (result.id)}
            <li class="settings-search__result">
                <a
                    href={result.hash
                        ? `${result.route}#${encodeURIComponent(result.hash)}`
                        : result.route}
                    class:settings-search__result-link--selected={i ===
                        selectedIndex}
                    class="settings-search__result-link"
                    onclick={(event) => {
                        event.preventDefault();
                        navigate(result);
                    }}
                >
                    <span class="settings-search__result-label"
                        >{result.label}</span
                    >
                    {#if result.badge}
                        <span class="settings-search__result-cat"
                            >{result.badge}</span
                        >
                    {/if}
                </a>
            </li>
        {:else}
            <li class="settings-search__empty">
                {$_("settings_search_no_results")}
            </li>
        {/each}
    </ul>
{/if}

<style lang="postcss">
    .settings-search {
        position: relative;
        margin-bottom: 12px;

        @media (max-width: 767px) {
            margin-top: 24px;
            margin-left: 20px;
            margin-right: 20px;
            margin-bottom: 0;
        }

        :global(.settings-search__icon) {
            position: absolute;
            top: 50%;
            left: 10px;
            transform: translateY(-50%);
            pointer-events: none;
        }

        &__input {
            width: 100%;
            height: 38px;
            padding: 0 12px 0 34px;
            border: 1px solid var(--border-color-2);
            border-radius: var(--border-radius-4);
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
            font-size: 14px;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
            }
        }
    }

    .settings-search__results {
        list-style: none;
        margin: 0 0 12px;
        padding: 4px;
        border: 1px solid var(--border-color-2);
        border-radius: var(--border-radius-4);
        background-color: var(--bg-color-2);
        max-height: 360px;
        overflow-y: auto;
    }

    .settings-search__result-link {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 10px;
        border-radius: var(--border-radius-3);
        color: var(--text-color-1);
        text-decoration: none;

        &:hover,
        &--selected {
            background-color: var(--bg-color-1);
        }
    }

    .settings-search__result-cat {
        flex-shrink: 0;
        font-size: 12px;
        color: var(--text-color-3);
    }

    .settings-search__empty {
        padding: 8px 10px;
        font-size: 13px;
        color: var(--text-color-3);
    }
</style>
