<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import X from '@lucide/svelte/icons/x';
    import Plus from '@lucide/svelte/icons/plus';
    import Minus from '@lucide/svelte/icons/minus';

    let {
        tokens = $bindable<string[]>([]),
        excludedTokens = $bindable<string[]>([]),
        negatable = false,
        placeholder = '',
        transform = undefined,
        ariaLabel = undefined,
    }: {
        tokens?: string[],
        excludedTokens?: string[],
        negatable?: boolean,
        placeholder?: string,
        transform?: (value: string) => string,
        ariaLabel?: string,
    } = $props();

    let value = $state('');

    function commit() {
        let token = value.trim();
        if (transform) token = transform(token).trim();
        if (token && !tokens.includes(token) && !excludedTokens.includes(token)) {
            tokens = [...tokens, token];
        }
        value = '';
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.isComposing || e.keyCode === 229) {
            return;
        }
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && value === '' && tokens.length) {
            tokens = tokens.slice(0, -1);
        }
    }

    function remove(token: string, negated: boolean) {
        if (negated) {
            excludedTokens = excludedTokens.filter(t => t !== token);
        } else {
            tokens = tokens.filter(t => t !== token);
        }
    }

    function toggleNegate(token: string, negated: boolean) {
        if (negated) {
            excludedTokens = excludedTokens.filter(t => t !== token);
            if (!tokens.includes(token)) {
                tokens = [...tokens, token];
            }
        } else {
            tokens = tokens.filter(t => t !== token);
            if (!excludedTokens.includes(token)) {
                excludedTokens = [...excludedTokens, token];
            }
        }
    }
</script>

{#snippet chip(token: string, negated: boolean)}
    <li class={['token-input__chip', negatable && 'token-input__chip--togglable', negated && 'token-input__chip--negated']}>
        {#if negatable}
            <button type="button" class="token-input__negate" onclick={() => toggleNegate(token, negated)} aria-pressed={negated} title={$_('search_filter_exclude_toggle')} aria-label={$_('search_filter_exclude_toggle')}>
                {#if negated}
                    <Minus size="12" color="var(--danger-color)"></Minus>
                {:else}
                    <Plus size="12" color="var(--text-color-3)"></Plus>
                {/if}
            </button>
        {/if}
        <span>{token}</span>
        <button type="button" class="token-input__remove" onclick={() => remove(token, negated)} aria-label={$_('remove')}>
            <X size="14" color="var(--text-color-3)"></X>
        </button>
    </li>
{/snippet}

<div class="token-input">
    {#if tokens.length || excludedTokens.length}
        <ul class="token-input__chips">
            {#each tokens as token (token)}
                {@render chip(token, false)}
            {/each}
            {#each excludedTokens as token (token)}
                {@render chip(token, true)}
            {/each}
        </ul>
    {/if}

    <input
        type="text"
        class="token-input__input"
        bind:value
        {placeholder}
        aria-label={ariaLabel}
        onkeydown={handleKeydown}
        onblur={commit}
        autocomplete="off"
    >
</div>

<style lang="postcss">
    .token-input {
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
        }
    }
</style>
