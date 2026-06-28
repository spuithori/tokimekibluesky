<script lang="ts">
    import { X } from 'lucide-svelte';

    let {
        tokens = $bindable<string[]>([]),
        placeholder = '',
        transform = undefined,
        ariaLabel = undefined,
    }: {
        tokens?: string[],
        placeholder?: string,
        transform?: (value: string) => string,
        ariaLabel?: string,
    } = $props();

    let value = $state('');

    function commit() {
        let token = value.trim();
        if (transform) token = transform(token).trim();
        if (token && !tokens.includes(token)) {
            tokens = [...tokens, token];
        }
        value = '';
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && value === '' && tokens.length) {
            tokens = tokens.slice(0, -1);
        }
    }

    function remove(token: string) {
        tokens = tokens.filter(t => t !== token);
    }
</script>

<div class="token-input">
    {#if tokens.length}
        <ul class="token-input__chips">
            {#each tokens as token (token)}
                <li class="token-input__chip">
                    <span>{token}</span>
                    <button type="button" class="token-input__remove" onclick={() => remove(token)} aria-label="Remove">
                        <X size="14" color="var(--text-color-3)"></X>
                    </button>
                </li>
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
