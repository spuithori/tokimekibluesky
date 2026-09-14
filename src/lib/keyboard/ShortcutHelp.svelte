<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import Modal from '$lib/components/ui/Modal.svelte';
    import { CATEGORY_LABELS, CATEGORY_ORDER, commands } from './commands';
    import { formatComboParts } from './keys';
    import { shortcutManager } from './shortcutManager.svelte';

    let { onclose }: { onclose: () => void } = $props();

    const groups = CATEGORY_ORDER.map((category) => ({
        category,
        label: CATEGORY_LABELS[category],
        commands: commands.filter((command) => command.category === category && !command.hidden),
    }));
</script>

<Modal title={$_('settings_keyboard')} size="small" {onclose}>
    <div class="kb-help">
        {#each groups as group (group.category)}
            <section class="kb-help__group">
                <h3 class="kb-help__title">{$_(group.label)}</h3>
                <ul class="kb-help__list">
                    {#each group.commands as command (command.id)}
                        {@const keys = shortcutManager.keysFor(command.id)}
                        {#if keys.length}
                            <li class="kb-help__row">
                                <span class="kb-help__label">{$_(command.label)}</span>
                                <span class="kb-help__keys">
                                    {#each keys as key (key)}
                                        <span class="kb-combo">
                                            {#each formatComboParts(key) as part, i (i)}
                                                <kbd class="kb-key">{part}</kbd>
                                            {/each}
                                        </span>
                                    {/each}
                                </span>
                            </li>
                        {/if}
                    {/each}
                </ul>
            </section>
        {/each}

        <p class="kb-help__hint">{$_('keyboard_shortcuts_help_hint')} <a href="/settings/keyboard" onclick={onclose}>{$_('keyboard_shortcuts_bindings')}</a></p>
    </div>
</Modal>

<style lang="postcss">
    .kb-help {
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: var(--text-color-1);
    }

    .kb-help__title {
        font-size: 14px;
        letter-spacing: .05em;
        color: var(--text-color-3);
        margin-bottom: 8px;
    }

    .kb-help__list {
        display: flex;
        flex-direction: column;
    }

    .kb-help__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 6px 0;
        border-bottom: 1px solid var(--border-color-2);
        font-size: 14px;
    }

    .kb-help__keys {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
    }

    .kb-combo {
        display: inline-flex;
        gap: 2px;
    }

    .kb-key {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        padding: 0 6px;
        border-radius: var(--border-radius-2, 4px);
        border: 1px solid var(--border-color-1);
        border-bottom-width: 2px;
        background-color: var(--bg-color-2);
        font-family: inherit;
        font-size: 12px;
        line-height: 1;
    }

    .kb-help__hint {
        font-size: 13px;
        color: var(--text-color-3);

        a {
            color: var(--primary-color);
            text-decoration: underline;
        }
    }
</style>
