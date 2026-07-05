<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { migrate } from '$lib/settings/migrations';
    import { muteListsState } from '$lib/classes/muteListsState.svelte';

    function exportSettings() {
        const data = {
            settings: settingsStore.snapshot,
            muteLists: {
                postMutes: muteListsState.postMutes,
                repostMutes: muteListsState.repostMutes,
            },
        };
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `tokimeki-settings-${new Date().toISOString().slice(0, 10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    async function importSettings(event: Event & { currentTarget: HTMLInputElement }) {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) {
            return;
        }
        try {
            const parsed = JSON.parse(await file.text());
            if (!confirm($_('settings_import_confirm'))) {
                return;
            }
            const isWrapped = parsed && typeof parsed === 'object' && 'settings' in parsed;
            settingsStore.raw = migrate(isWrapped ? parsed.settings : parsed);
            if (isWrapped && parsed.muteLists) {
                muteListsState.importLists(parsed.muteLists);
            }
            toast.success($_('settings_import_success'));
        } catch (e) {
            console.error('Failed to import settings', e);
            toast.error($_('settings_import_error'));
        } finally {
            input.value = '';
        }
    }
</script>

<div class="bookmark-import-export">
    <h2 class="bookmark-import-export__title">{$_('settings_backup_title')}</h2>
    <p class="bookmark-import-export__description">{$_('settings_backup_description')}</p>

    <div class="bookmark-import-export__buttons">
        <button class="button button--border" onclick={exportSettings}>{$_('settings_export')}</button>

        <label class="button button--border">
            {$_('settings_import')}
            <input type="file" accept="application/json,.json" onchange={importSettings} hidden />
        </label>
    </div>
</div>

<style lang="postcss">
    .bookmark-import-export {
        padding: 16px;
        border-radius: var(--border-radius-3);
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        margin-top: 16px;

        &__title {
            font-size: 18px;
            margin-bottom: 4px;
        }

        &__description {
            font-size: 14px;
            color: var(--text-color-3);
        }

        &__buttons {
            display: flex;
            gap: 8px;
            margin-top: 16px;
        }
    }
</style>
