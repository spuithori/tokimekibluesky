<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import Plus from '@lucide/svelte/icons/plus';
    import { CATEGORY_LABELS, CATEGORY_ORDER, commands } from '$lib/keyboard/commands';
    import { eventToCombo, formatComboParts } from '$lib/keyboard/keys';
    import { shortcutManager } from '$lib/keyboard/shortcutManager.svelte';

    const groups = CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        commands: commands.filter((command) => command.category === category && !command.hidden),
    }));

    let recording = $state<{ id: string; index: number } | null>(null);

    function startRecording(id: string, index: number) {
        recording = { id, index };
    }

    function handleCapture(event: KeyboardEvent) {
        if (!recording) {
            return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.isComposing) {
            return;
        }
        const { id, index } = recording;
        if (event.key === 'Escape') {
            recording = null;
            return;
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
            shortcutManager.removeKey(id, index);
            recording = null;
            return;
        }
        const combo = eventToCombo(event);
        if (!combo) {
            return;
        }
        const conflict = shortcutManager.conflictFor(combo, id);
        if (conflict) {
            toast.error($_('kb_conflict', { name: $_(conflict.label) }));
            recording = null;
            return;
        }
        shortcutManager.setKey(id, index, combo);
        recording = null;
    }

    function handleBlur() {
        recording = null;
    }
</script>

<svelte:window onkeydowncapture={handleCapture} />

<div class="kb-bindings">
    {#each groups as group (group.category)}
        <section class="kb-bindings__group">
            <h3 class="kb-bindings__title">{$_(group.label)}</h3>
            <ul class="kb-bindings__list">
                {#each group.commands as command (command.id)}
                    {@const keys = shortcutManager.keysFor(command.id)}
                    <li class="kb-bindings__row">
                        <span class="kb-bindings__label">{$_(command.label)}</span>
                        <span class="kb-bindings__keys">
                            {#each keys as key, index (key)}
                                {@const active = recording?.id === command.id && recording.index === index}
                                <button
                                    class="kb-chip"
                                    class:kb-chip--recording={active}
                                    type="button"
                                    onclick={() => startRecording(command.id, index)}
                                    onblur={handleBlur}
                                >
                                    {#if active}
                                        {$_('kb_press_key')}
                                    {:else}
                                        {#each formatComboParts(key) as part, i (i)}
                                            <kbd class="kb-chip__key">{part}</kbd>
                                        {/each}
                                    {/if}
                                </button>
                            {/each}

                            {#if recording?.id === command.id && recording.index === -1}
                                <button class="kb-chip kb-chip--recording" type="button" onblur={handleBlur}>{$_('kb_press_key')}</button>
                            {:else}
                                <button class="kb-chip kb-chip--add" type="button" aria-label={$_('kb_add_key')} onclick={() => startRecording(command.id, -1)}>
                                    <Plus size="14" color="var(--text-color-3)"></Plus>
                                </button>
                            {/if}

                            {#if shortcutManager.isOverridden(command.id)}
                                <button class="kb-reset" type="button" onclick={() => shortcutManager.resetKeys(command.id)}>{$_('kb_reset')}</button>
                            {/if}
                        </span>
                    </li>
                {/each}
            </ul>
        </section>
    {/each}
</div>

<p class="settings-group__description">{$_('keyboard_shortcuts_bindings_description')}</p>

<style lang="postcss">
    .kb-bindings {
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
    }

    .kb-bindings__title {
        font-size: 13px;
        letter-spacing: .05em;
        color: var(--text-color-3);
        margin-bottom: 4px;
    }

    .kb-bindings__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid var(--border-color-2);
        font-size: 14px;
        color: var(--text-color-1);
    }

    .kb-bindings__keys {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }

    .kb-chip {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        min-height: 26px;
        padding: 0 6px;
        border-radius: var(--border-radius-2, 4px);
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-2);
        color: var(--text-color-1);
        font-size: 12px;
        cursor: pointer;

        &--recording {
            border-color: var(--primary-color);
            color: var(--primary-color);
        }

        &--add {
            min-width: 26px;
            justify-content: center;
        }
    }

    .kb-chip__key {
        font-family: inherit;
        font-size: 12px;
        line-height: 1;
    }

    .kb-reset {
        font-size: 12px;
        color: var(--primary-color);
        text-decoration: underline;
    }
</style>
