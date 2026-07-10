<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import X from '@lucide/svelte/icons/x';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';
    import { parsePostInput, toPostAtUri, shortPostLabel } from '$lib/search/postUriInput';

    let {
        uris = $bindable<string[]>([]),
        excludedUris = $bindable<string[]>([]),
        negatable = false,
        resolveDid,
        placeholder = '',
        ariaLabel = undefined,
    }: {
        uris?: string[],
        excludedUris?: string[],
        negatable?: boolean,
        resolveDid: (handle: string) => Promise<string>,
        placeholder?: string,
        ariaLabel?: string,
    } = $props();

    let value = $state('');
    let busy = $state(false);
    let hasError = $state(false);

    async function commit() {
        const raw = value.trim();
        if (!raw || busy) {
            return;
        }
        if (!parsePostInput(raw)) {
            hasError = true;
            return;
        }
        hasError = false;
        busy = true;
        try {
            const uri = await toPostAtUri(raw, resolveDid);
            if (!uri) {
                hasError = true;
                return;
            }
            if (!uris.includes(uri) && !excludedUris.includes(uri)) {
                uris = [...uris, uri];
            }
            value = '';
        } catch (e) {
            console.error(e);
            hasError = true;
        } finally {
            busy = false;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.isComposing || e.keyCode === 229) {
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && value === '' && uris.length) {
            uris = uris.slice(0, -1);
        }
    }

    function handleInput() {
        hasError = false;
    }

    function remove(uri: string, negated: boolean) {
        if (negated) {
            excludedUris = excludedUris.filter(u => u !== uri);
        } else {
            uris = uris.filter(u => u !== uri);
        }
    }

    function toggleNegate(uri: string, negated: boolean) {
        if (negated) {
            excludedUris = excludedUris.filter(u => u !== uri);
            if (!uris.includes(uri)) {
                uris = [...uris, uri];
            }
        } else {
            uris = uris.filter(u => u !== uri);
            if (!excludedUris.includes(uri)) {
                excludedUris = [...excludedUris, uri];
            }
        }
    }
</script>

{#snippet chip(uri: string, negated: boolean)}
    <li class={['post-uri-input__chip', negatable && 'post-uri-input__chip--togglable', negated && 'post-uri-input__chip--negated']}>
        {#if negatable}
            <button type="button" class="post-uri-input__negate" onclick={() => toggleNegate(uri, negated)} aria-pressed={negated} title={$_('search_filter_exclude_toggle')} aria-label={$_('search_filter_exclude_toggle')}>
                {#if negated}
                    <Minus size="12" color="var(--danger-color)"></Minus>
                {:else}
                    <Plus size="12" color="var(--text-color-3)"></Plus>
                {/if}
            </button>
        {/if}
        <span>{shortPostLabel(uri)}</span>
        <button type="button" class="post-uri-input__remove" onclick={() => remove(uri, negated)} aria-label={$_('remove')}>
            <X size="14" color="var(--text-color-3)"></X>
        </button>
    </li>
{/snippet}

<div class="post-uri-input">
    {#if uris.length || excludedUris.length}
        <ul class="post-uri-input__chips">
            {#each uris as uri (uri)}
                {@render chip(uri, false)}
            {/each}
            {#each excludedUris as uri (uri)}
                {@render chip(uri, true)}
            {/each}
        </ul>
    {/if}

    <input
        type="text"
        class={['post-uri-input__input', hasError && 'post-uri-input__input--error']}
        bind:value
        {placeholder}
        aria-label={ariaLabel}
        disabled={busy}
        onkeydown={handleKeydown}
        oninput={handleInput}
        onblur={commit}
        autocomplete="off"
    >

    {#if hasError}
        <p class="post-uri-input__error">{$_('search_quote_resolve_error')}</p>
    {/if}
</div>

<style lang="postcss">
    .post-uri-input {
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

            span {
                max-width: 240px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            &--togglable {
                padding-left: 4px;
            }

            &--negated {
                border-color: var(--danger-color);

                span {
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

        &__input {
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

            &--error {
                border-color: var(--danger-color);
            }
        }

        &__error {
            font-size: 12px;
            color: var(--danger-color);
        }
    }
</style>
