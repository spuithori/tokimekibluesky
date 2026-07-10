<script lang="ts">
    import { onDestroy } from 'svelte';
    import { scale } from 'svelte/transition';
    import { backOut } from 'svelte/easing';

    let { value = $bindable(''), disabled = false, id = 'handle', placeholder = 'example.bsky.social' } = $props();

    let suggestions = $state.raw<any[]>([]);
    let selectedIndex = $state(-1);
    let isOpen = $state(false);
    let failed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let wrapperEl: HTMLElement;

    function handleInput() {
        clearTimeout(timer);
        timer = setTimeout(query, 250);
    }

    async function query() {
        const term = value.trim().replace(/^@/, '');
        if (!term || term.startsWith('did:') || failed) {
            closeList();
            return;
        }

        controller?.abort();
        controller = new AbortController();
        const signal = controller.signal;

        try {
            const res = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(term)}&limit=6`, { signal });
            if (!res.ok) {
                failed = true;
                closeList();
                return;
            }
            const data = await res.json();
            suggestions = data.actors ?? [];
            selectedIndex = -1;
            isOpen = suggestions.length > 0;
        } catch (e) {
            if (signal.aborted) {
                return;
            }
            failed = true;
            closeList();
        }
    }

    function closeList() {
        isOpen = false;
        suggestions = [];
        selectedIndex = -1;
    }

    function select(index: number) {
        const item = suggestions[index];
        if (item) {
            value = item.handle;
            closeList();
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (!isOpen) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex + suggestions.length - 1) % suggestions.length;
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
            event.preventDefault();
            select(selectedIndex);
        } else if (event.key === 'Escape') {
            closeList();
        }
    }

    function handleFocusOut(event: FocusEvent) {
        if (!wrapperEl.contains(event.relatedTarget as Node)) {
            closeList();
        }
    }

    onDestroy(() => {
        clearTimeout(timer);
        controller?.abort();
    });
</script>

<div class="handle-typeahead" bind:this={wrapperEl} onfocusout={handleFocusOut}>
    <span class="handle-typeahead__prefix">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/>
            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>
        </svg>
    </span>

    <input
        class="handle-typeahead__input"
        type="text"
        name="handle"
        {id}
        {placeholder}
        bind:value
        {disabled}
        required
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls="{id}-listbox"
        oninput={handleInput}
        onkeydown={handleKeydown}
    >

    {#if isOpen}
        <div class="handle-typeahead__list" role="listbox" id="{id}-listbox" transition:scale={{ duration: 300, start: 0.92, opacity: 0, easing: backOut }}>
            {#each suggestions as item, index (item.did)}
                <button
                    type="button"
                    role="option"
                    aria-selected={index === selectedIndex}
                    class="handle-typeahead__item"
                    class:handle-typeahead__item--selected={index === selectedIndex}
                    onmousedown={(e) => { e.preventDefault(); select(index); }}
                >
                    <span class="handle-typeahead__avatar">
                        {#if (item.avatar)}
                            <img src="{item.avatar}" alt="">
                        {/if}
                    </span>

                    <span class="handle-typeahead__content">
                        <span class="handle-typeahead__name">{item.displayName || item.handle}</span>
                        <span class="handle-typeahead__handle">@{item.handle}</span>
                    </span>
                </button>
            {/each}
        </div>
    {/if}
</div>

<style lang="postcss">
    .handle-typeahead {
        position: relative;

        &__prefix {
            position: absolute;
            top: 0;
            left: 10px;
            height: 50px;
            display: flex;
            align-items: center;
            pointer-events: none;
        }

        &__input {
            width: 100%;
            height: 50px;
            border-radius: 4px;
            border: 1px solid var(--border-color-1);
            color: var(--text-color-1);
            background-color: var(--bg-color-2);
            padding: 0 20px 0 36px;

            &:disabled {
                opacity: 0.6;
            }
        }

        &__list {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            background-color: var(--bg-color-1);
            padding: 8px;
            z-index: 10;
            border-radius: var(--border-radius-3);
            box-shadow: 0 0 10px var(--box-shadow-color-2);
            transform-origin: top;
        }

        &__item {
            color: var(--text-color-1);
            font-size: 14px;
            white-space: nowrap;
            padding: 6px;
            width: 100%;
            text-align: left;
            display: grid;
            grid-template-columns: 28px 1fr;
            gap: 8px;
            align-items: center;
            border-radius: var(--border-radius-2);

            &--selected,
            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__avatar {
            overflow: hidden;
            aspect-ratio: 1 / 1;
            border-radius: 50%;
            background-color: var(--primary-color);

            img {
                display: block;
                width: 100%;
            }
        }

        &__content {
            display: flex;
            flex-direction: column;
            line-height: 1.3;
            overflow: hidden;
        }

        &__name {
            font-weight: bold;
            font-size: 13px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        &__handle {
            font-size: 12px;
            color: var(--text-color-2);
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
</style>
