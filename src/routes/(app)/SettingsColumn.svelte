<script lang="ts">
    import { setContext } from "svelte";
    import { _ } from "svelte-i18n";
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import LifeBuoy from '@lucide/svelte/icons/life-buoy';
    import { getScopedColumnState } from "$lib/classes/columnState.svelte";
    import { animateLayout } from "$lib/animations/flip";
    import { settingsNav } from "$lib/settings/nav";
    import { isSettingsPageId, parentCategoryId, SETTINGS_COLUMN_HOST, SETTINGS_PAGE_TITLES, type SettingsPageId } from "$lib/settings/pagesRegistry";
    import SettingsSearch from "$lib/components/settings/SettingsSearch.svelte";

    setContext(SETTINGS_COLUMN_HOST, true);

    const loaders: Record<SettingsPageId, () => Promise<{ default: any }>> = {
        'profiles': () => import('./settings/profiles/+page.svelte'),
        'general': () => import('./settings/general/+page.svelte'),
        'design': () => import('./settings/design/+page.svelte'),
        'design/embed': () => import('./settings/design/embed/+page.svelte'),
        'timeline': () => import('./settings/timeline/+page.svelte'),
        'timeline/reaction': () => import('./settings/timeline/reaction/+page.svelte'),
        'moderation': () => import('./settings/moderation/+page.svelte'),
        'moderation/chat': () => import('./settings/moderation/chat/+page.svelte'),
        'moderation/labeler': () => import('./settings/moderation/labeler/+page.svelte'),
        'moderation/lang-filter': () => import('./settings/moderation/lang-filter/+page.svelte'),
        'moderation/modlist': () => import('./settings/moderation/modlist/+page.svelte'),
        'moderation/repost-mute': () => import('./settings/moderation/repost-mute/+page.svelte'),
        'keyword-mutes': () => import('./settings/keyword-mutes/+page.svelte'),
        'push-notification': () => import('./settings/push-notification/+page.svelte'),
        'schedule': () => import('./settings/schedule/+page.svelte'),
        'data': () => import('./settings/data/+page.svelte'),
        'data/workspace-import-export': () => import('./settings/data/workspace-import-export/+page.svelte'),
        'about': () => import('./settings/about/+page.svelte'),
        'support': () => import('./settings/support/+page.svelte'),
        'translation': () => import('./settings/translation/+page.svelte'),
        'rice': () => import('./settings/rice/+page.svelte'),
    };

    interface Props {
        index: number;
    }

    let { index }: Props = $props();

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
    const categoryId = $derived.by(() => {
        const id = column?.algorithm?.id;
        return id && isSettingsPageId(id) ? id : 'root';
    });
    const loader = $derived(categoryId !== 'root' ? loaders[categoryId] : undefined);
    const titleKey = $derived(categoryId === 'root' ? 'settings' : (SETTINGS_PAGE_TITLES[categoryId] ?? 'settings'));

    function navigate(id: SettingsPageId | 'root') {
        if (!column) return;
        column.algorithm = {
            ...column.algorithm,
            id: id !== 'root' ? id : undefined,
        };
        column.scrollElement?.scrollTo?.({ top: 0 });
    }

    function handleClose() {
        const col = column;
        if (!col) return;
        animateLayout(() => columnState.remove(col.id), { exiting: [col.id] });
    }
</script>

<div class="settings-column-view">
    <div class="settings-column-view__header">
        {#if categoryId !== 'root'}
            <button class="settings-column-view__header-button" aria-label="Back" onclick={() => navigate(parentCategoryId(categoryId))}>
                <ArrowLeft size="20" color="var(--text-color-1)"></ArrowLeft>
            </button>
        {/if}

        <span class="settings-column-view__header-title">
            {$_(titleKey)}
        </span>

        <button class="settings-column-view__header-button settings-column-view__header-button--close" aria-label="Close" onclick={handleClose}>
            <X size="20" color="var(--text-color-1)"></X>
        </button>
    </div>

    {#if categoryId === 'root'}
        <div class="settings-column-view__toc">
            <SettingsSearch />

            <ul class="settings-column-view__nav">
                {#each settingsNav as item (item.id)}
                    {@const Icon = item.icon}
                    <li>
                        <button class="settings-column-view__nav-button" onclick={() => navigate(item.id as SettingsPageId)}>
                            <Icon size="20" color="var(--text-color-1)"></Icon>
                            {$_(item.label)}
                        </button>
                    </li>
                {/each}

                <li>
                    <button class="settings-column-view__nav-button" onclick={() => navigate('support')}>
                        <LifeBuoy size="20" color="var(--text-color-1)"></LifeBuoy>
                        {$_('settings_support')}
                    </button>
                </li>
            </ul>
        </div>
    {:else if loader}
        <div class="settings-column-view__page">
            {#key categoryId}
                {#await loader() then { default: Page }}
                    <Page></Page>
                {/await}
            {/key}
        </div>
    {/if}
</div>

<style lang="postcss">
    .settings-column-view {
        &__header {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color-2);
            position: sticky;
            top: var(--deck-heading-space, var(--deck-heading-height));
            background-color: var(--bg-color-1);
            z-index: 5;
        }

        &__header-title {
            font-weight: bold;
            font-size: 14px;
            color: var(--text-color-1);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &__header-button {
            display: grid;
            place-content: center;
            width: 32px;
            height: 32px;
            border-radius: var(--border-radius-2);
            flex-shrink: 0;

            &:hover {
                background-color: var(--bg-color-2);
            }

            &--close {
                margin-left: auto;
            }
        }

        &__toc {
            padding: 12px;
        }

        &__nav {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-top: 12px;
        }

        &__nav-button {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            padding: 10px 12px;
            border-radius: var(--border-radius-3);
            color: var(--text-color-1);
            font-size: 14px;
            font-weight: bold;
            text-align: left;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__page {
            padding: 0 12px 24px;
        }
    }
</style>
