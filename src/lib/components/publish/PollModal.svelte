<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { Plus, Trash2 } from 'lucide-svelte';
    import type { Poll, PollDuration } from '$lib/classes/postState.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import { settings } from '$lib/stores';

    interface Props {
        poll: Poll;
        onclose: () => void;
        onsave: (poll: Poll) => void;
    }

    let { poll, onclose, onsave }: Props = $props();

    let options = $state<string[]>(poll?.options ? [...poll.options] : ['', '']);
    let duration = $state<PollDuration>(poll?.duration ?? '1d');

    function formatDuration(value: PollDuration): string {
        const locale = $settings?.general?.userLanguage || 'en';
        const formatter = new Intl.DurationFormat(locale, { style: 'long' });

        switch (value) {
            case '5m': return formatter.format({ minutes: 5 });
            case '1h': return formatter.format({ hours: 1 });
            case '6h': return formatter.format({ hours: 6 });
            case '12h': return formatter.format({ hours: 12 });
            case '1d': return formatter.format({ days: 1 });
            case '3d': return formatter.format({ days: 3 });
            case '7d': return formatter.format({ days: 7 });
            default: return value;
        }
    }

    const durations: PollDuration[] = [
        '5m', // For testing only
        '1h',
        '6h',
        '12h',
        '1d',
        '3d',
        '7d',
    ];

    const canAddOption = $derived(options.length < 4);
    const canRemoveOption = $derived(options.length > 2);
    const isValid = $derived(options.filter(o => o.trim()).length >= 2);

    function addOption() {
        if (canAddOption) {
            options = [...options, ''];
        }
    }

    function removeOption(index: number) {
        if (canRemoveOption) {
            options = options.filter((_, i) => i !== index);
        }
    }

    function handleSave() {
        const validOptions = options.map(o => o.trim()).filter(o => o);
        if (validOptions.length >= 2) {
            onsave({
                options: validOptions,
                duration
            });
        }
    }

    function handleRemove() {
        onsave(undefined);
    }
</script>

<Modal title={$_('poll_add')} {onclose} size="small">
    <div class="poll-modal-content">
        <div class="poll-options">
            {#each options as option, index}
                <div class="poll-option-row">
                    <input
                        type="text"
                        bind:value={options[index]}
                        placeholder={$_('poll_option_placeholder', { values: { index: index + 1 } })}
                        maxlength="100"
                        class="poll-option-input"
                    />
                    {#if canRemoveOption}
                        <button
                            type="button"
                            class="remove-option-button"
                            onclick={() => removeOption(index)}
                            aria-label="Remove option"
                        >
                            <Trash2 size="16" />
                        </button>
                    {/if}
                </div>
            {/each}

            {#if canAddOption}
                <button type="button" class="add-option-button" onclick={addOption}>
                    <Plus size="16" />
                    {$_('poll_add_option')}
                </button>
            {/if}
        </div>

        <div class="poll-duration">
            <label for="poll-duration">{$_('poll_duration')}</label>
            <select id="poll-duration" bind:value={duration} class="duration-select">
                {#each durations as d}
                    <option value={d}>{formatDuration(d)}</option>
                {/each}
            </select>
        </div>
    </div>

    <div class="poll-modal-footer">
        {#if poll}
            <button type="button" class="remove-button" onclick={handleRemove}>
                {$_('poll_remove')}
            </button>
        {/if}
        <button type="button" class="save-button" onclick={handleSave} disabled={!isValid}>
            {$_('apply_button')}
        </button>
    </div>
</Modal>

<style lang="postcss">
    .poll-modal-content {
        padding-bottom: 16px;
    }

    .poll-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;
    }

    .poll-option-row {
        display: flex;
        gap: 8px;
    }

    .poll-option-input {
        flex: 1;
        padding: 10px 12px;
        background-color: var(--bg-color-2);
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        color: var(--text-color-1);
        font-size: 14px;

        &:focus {
            outline: none;
            border-color: var(--primary-color);
        }

        &::placeholder {
            color: var(--text-color-3);
        }
    }

    .remove-option-button {
        background: none;
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        color: var(--text-color-3);
        padding: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
            border-color: var(--danger-color);
            color: var(--danger-color);
        }
    }

    .add-option-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 10px;
        background-color: var(--bg-color-2);
        border: 1px dashed var(--border-color-1);
        border-radius: 8px;
        color: var(--text-color-3);
        font-size: 14px;
        cursor: pointer;

        &:hover {
            border-color: var(--primary-color);
            color: var(--primary-color);
        }
    }

    .poll-duration {
        display: flex;
        flex-direction: column;
        gap: 8px;

        label {
            font-size: 14px;
            color: var(--text-color-3);
        }
    }

    .duration-select {
        padding: 10px 12px;
        background-color: var(--bg-color-2);
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        color: var(--text-color-1);
        font-size: 14px;
        cursor: pointer;

        &:focus {
            outline: none;
            border-color: var(--primary-color);
        }
    }

    .poll-modal-footer {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
    }

    .remove-button {
        padding: 8px 16px;
        background: none;
        border: 1px solid var(--danger-color);
        border-radius: 9999px;
        color: var(--danger-color);
        font-size: 14px;
        cursor: pointer;

        &:hover {
            background-color: var(--danger-color);
            color: white;
        }
    }

    .save-button {
        padding: 8px 20px;
        background-color: var(--primary-color);
        border: none;
        border-radius: 9999px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        &:hover:not(:disabled) {
            filter: brightness(1.1);
        }
    }
</style>
