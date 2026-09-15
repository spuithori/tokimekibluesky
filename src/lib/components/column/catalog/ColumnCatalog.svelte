<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { liveQuery } from 'dexie';
    import { toast } from 'svelte-sonner';
    import Search from '@lucide/svelte/icons/search';
    import X from '@lucide/svelte/icons/x';
    import { db } from '$lib/db';
    import { bookmarkModal, cloudBookmarkModal, cloudListModal, listModal, officialListModal, userLists } from '$lib/stores';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { migrateLocalList, migrateLocalLists, unmigratedLocalLists as filterUnmigratedLocalLists } from '$lib/localListMigration';
    import BookmarkObserver from '$lib/components/bookmark/BookmarkObserver.svelte';
    import CloudBookmarkObserver from '$lib/components/bookmark/CloudBookmarkObserver.svelte';
    import CloudListObserver from '$lib/components/list/CloudListObserver.svelte';
    import ListObserver from '$lib/components/list/ListObserver.svelte';
    import OfficialListObserver from '$lib/components/list/OfficialListObserver.svelte';
    import ColumnChoicesMerge from '$lib/components/column/ColumnChoicesMerge.svelte';
    import CatalogSection from './CatalogSection.svelte';
    import CatalogRow from './CatalogRow.svelte';
    import { CatalogSourcesState } from './catalogSources.svelte';
    import { buildCatalog, countAddedByKey, filterCatalog, normalizeQuery, type CatalogItem, type CatalogSectionId } from './columnCatalog';
    import type { Column } from '$lib/types/column';

    interface Props {
        _agent: any;
        onadd: (column: Column) => void;
        autofocus?: boolean;
    }

    let { _agent, onadd, autofocus = false }: Props = $props();

    const columnState = getColumnState();
    const sources = new CatalogSourcesState(_agent);
    sources.load();

    const bookmarks = liveQuery(() => db.bookmarks.toArray());

    let query = $state('');
    let migrating = $state(false);

    const did = _agent.did();
    const handle = _agent.handle();

    const unmigratedLocalLists = $derived(filterUnmigratedLocalLists($userLists, did));
    const migratableListIds = $derived(new Set(unmigratedLocalLists.map(list => String(list.id))));

    const catalog = $derived(buildCatalog({
        did,
        handle,
        feeds: sources.feeds,
        lists: sources.lists,
        cloudLists: sources.cloudLists,
        cloudBookmarks: sources.cloudBookmarks,
        localLists: $userLists ?? [],
        localBookmarks: $bookmarks ?? [],
        migratableLocalListIds: migratableListIds,
        atmosphereEnabled: !settingsStore.general.disableAtmosphere,
        labels: {
            notifications: $_('notifications'),
            myPost: $_('my_post'),
            myMedia: $_('my_media'),
            likes: $_('likes'),
            officialBookmark: $_('official_bookmark'),
            chatList: $_('chat_list'),
            mochott: $_('mochott_timeline'),
            networkFeed: $_('network_feed'),
        },
    }));

    const searching = $derived(normalizeQuery(query) !== '');
    const visible = $derived(filterCatalog(catalog, query));
    const addedCounts = $derived(countAddedByKey(columnState.columns, did));

    const titles: Record<CatalogSectionId, string> = $derived({
        basic: $_('basic_columns'),
        feeds: $_('feed_columns'),
        lists: $_('official_list_columns'),
        bookmarks: $_('bookmark_cloud'),
        merge: $_('merge_timeline'),
        atmosphere: $_('atmosphere'),
        local: $_('catalog_local_title'),
    });

    const helpUrls: Partial<Record<CatalogSectionId, string>> = {
        lists: 'https://docs.tokimeki.blue/ja/usage/list',
        bookmarks: 'https://docs.tokimeki.blue/ja/usage/bookmark-cloud',
        local: 'https://docs.tokimeki.blue/ja/usage/list#%E3%83%AD%E3%83%BC%E3%82%AB%E3%83%AB%E3%83%AA%E3%82%B9%E3%83%88%E3%81%A8%E3%81%AF',
    };

    function isOpen(id: CatalogSectionId): boolean {
        return searching || !settingsStore.columnCatalog.collapsed.includes(id);
    }

    function toggle(id: CatalogSectionId, open: boolean) {
        const collapsed = settingsStore.columnCatalog.collapsed;
        if (open) {
            settingsStore.columnCatalog.collapsed = collapsed.filter(entry => entry !== id);
        } else if (!collapsed.includes(id)) {
            settingsStore.columnCatalog.collapsed = [...collapsed, id];
        }
    }

    function loadingOf(id: CatalogSectionId): boolean {
        switch (id) {
            case 'feeds':
                return sources.feedsLoading;
            case 'lists':
                return sources.listsLoading || sources.cloudListsLoading;
            case 'bookmarks':
                return sources.cloudBookmarksLoading;
            default:
                return false;
        }
    }

    function emptyTextOf(id: CatalogSectionId): string | undefined {
        switch (id) {
            case 'feeds':
                return $_('catalog_empty_feeds');
            case 'lists':
                return $_('there_is_no_official_list');
            case 'bookmarks':
                return $_('there_is_no_bookmark');
            case 'local':
                return $_('catalog_empty_local');
            default:
                return undefined;
        }
    }

    function handleAdd(item: CatalogItem) {
        onadd(structuredClone($state.snapshot(item.column)) as Column);
    }

    function handleEdit(item: CatalogItem) {
        const algorithm = item.column.algorithm.algorithm as string;
        switch (item.editable) {
            case 'list':
                listModal.set({ open: true, data: algorithm } as any);
                break;
            case 'cloudList':
                cloudListModal.set({ open: true, data: algorithm });
                break;
            case 'bookmark':
                bookmarkModal.set({ open: true, data: Number(algorithm) } as any);
                break;
            case 'cloudBookmark':
                cloudBookmarkModal.set({ open: true, data: algorithm } as any);
                break;
            case 'officialList':
                $officialListModal = { open: true, uri: algorithm } as any;
                break;
        }
    }

    function focusOnMount(node: HTMLInputElement) {
        if (autofocus) {
            node.focus();
        }
    }

    function persistLocalLists() {
        userLists.update(lists => {
            localStorage.setItem('lists', JSON.stringify(lists));
            return lists;
        });
    }

    async function handleMigrateOne(item: CatalogItem) {
        if (migrating) {
            return;
        }
        const list = unmigratedLocalLists.find(entry => String(entry.id) === String(item.column.algorithm.algorithm));
        if (!list) {
            return;
        }
        migrating = true;
        try {
            await migrateLocalList(_agent, list);
            persistLocalLists();
            toast.success($_('migrate_local_lists_success'));
            await sources.reloadCloudLists();
        } catch (e) {
            console.error(e);
            toast.error($_('migrate_local_lists_failed'));
        }
        migrating = false;
    }

    async function handleMigrateAll() {
        if (migrating) {
            return;
        }
        migrating = true;
        const { success, failed } = await migrateLocalLists(_agent, unmigratedLocalLists);
        persistLocalLists();
        if (success) {
            toast.success($_('migrate_local_lists_success'));
        }
        if (failed) {
            toast.error($_('migrate_local_lists_failed'));
        }
        await sources.reloadCloudLists();
        migrating = false;
    }

    function removeColumnsOf(type: string, algorithm: string | number) {
        columnState.columns
            .filter(column => column.algorithm.type === type && String(column.algorithm.algorithm) === String(algorithm))
            .forEach(column => columnState.remove(column.id));
    }

    function handleBookmarkClose(clear: boolean, id: number) {
        if (clear) {
            removeColumnsOf('bookmark', id);
        }
    }

    function handleCloudBookmarkClose() {
        sources.reloadCloudBookmarks();
    }

    function handleCloudListClose(clear: boolean, id: number) {
        if (clear && id) {
            removeColumnsOf('cloudList', id);
        }
        sources.reloadCloudLists();
    }

    function handleListClose(id: string) {
        if (id) {
            removeColumnsOf('list', id);
        }
    }

    function handleOfficialListClose() {
        sources.reloadLists();
    }
</script>

<div class="catalog">
    <div class="catalog__search">
        <span class="catalog__search-icon"><Search size={18} color="var(--text-color-3)" /></span>
        <input
            class="catalog__search-input"
            type="search"
            bind:value={query}
            placeholder={$_('catalog_search_placeholder')}
            aria-label={$_('catalog_search_placeholder')}
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
            {@attach focusOnMount}
        >
        {#if query}
            <button class="catalog__search-clear" type="button" onclick={() => (query = '')} aria-label={$_('close')}>
                <X size={16} color="var(--text-color-3)" />
            </button>
        {/if}
    </div>

    {#if searching && !visible.length}
        <p class="catalog__nothing">{$_('catalog_no_results')}</p>
    {/if}

    <div class="catalog__sections">
        {#each visible as section (section.id)}
            {#if section.id === 'merge'}
                {#if !searching}
                    <CatalogSection id={section.id} title={titles.merge} open={isOpen('merge')} ontoggle={(open) => toggle('merge', open)} description={$_('catalog_merge_description')}>
                        <ColumnChoicesMerge {_agent} {onadd}></ColumnChoicesMerge>
                    </CatalogSection>
                {/if}
            {:else if section.id === 'atmosphere' && !section.items.length}
                {''}
            {:else}
                <CatalogSection
                    id={section.id}
                    title={titles[section.id]}
                    count={section.items.length}
                    open={isOpen(section.id)}
                    loading={loadingOf(section.id)}
                    helpUrl={helpUrls[section.id]}
                    description={section.id === 'local' ? $_('catalog_local_description') : undefined}
                    ontoggle={(open) => toggle(section.id, open)}
                >
                    {#snippet actions()}
                        {#if section.id === 'lists'}
                            <button class="catalog__action" type="button" onclick={() => { $officialListModal.open = true; }}>{$_('catalog_create_list')}</button>
                            <button class="catalog__action" type="button" onclick={() => cloudListModal.set({ open: true, data: undefined })}>{$_('catalog_create_cloud_list')}</button>
                        {:else if section.id === 'bookmarks'}
                            <button class="catalog__action" type="button" onclick={() => cloudBookmarkModal.set({ open: true, data: undefined })}>{$_('new_create')}</button>
                        {:else if section.id === 'local'}
                            {#if unmigratedLocalLists.length}
                                <button class="catalog__action" type="button" onclick={handleMigrateAll} disabled={migrating}>{$_('migrate_local_lists')} ({unmigratedLocalLists.length})</button>
                            {/if}
                            <button class="catalog__action" type="button" onclick={() => bookmarkModal.set({ open: true, data: undefined })}>{$_('catalog_create_local_bookmark')}</button>
                        {/if}
                    {/snippet}

                    {#if section.items.length}
                        <div class="catalog__grid">
                            {#each section.items as item (item.key)}
                                <CatalogRow
                                    {item}
                                    added={addedCounts.get(item.key) ?? 0}
                                    onadd={handleAdd}
                                    onedit={item.editable ? handleEdit : undefined}
                                    onmigrate={item.migratable ? handleMigrateOne : undefined}
                                    {migrating}
                                ></CatalogRow>
                            {/each}
                        </div>
                    {:else if !loadingOf(section.id)}
                        <p class="catalog__empty">{emptyTextOf(section.id)}</p>
                    {/if}
                </CatalogSection>
            {/if}
        {/each}
    </div>
</div>

<BookmarkObserver close={handleBookmarkClose} {_agent}></BookmarkObserver>
<CloudBookmarkObserver close={handleCloudBookmarkClose} {_agent}></CloudBookmarkObserver>
<CloudListObserver close={handleCloudListClose} {_agent}></CloudListObserver>
<ListObserver onclose={handleListClose} {_agent}></ListObserver>
<OfficialListObserver {_agent} onclose={handleOfficialListClose}></OfficialListObserver>

<style lang="postcss">
    .catalog {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .catalog__search {
        position: relative;
        display: flex;
        align-items: center;
    }

    .catalog__search-icon {
        position: absolute;
        left: 14px;
        display: grid;
        place-items: center;
        pointer-events: none;
    }

    .catalog__search-input {
        width: 100%;
        height: 46px;
        padding: 0 40px 0 42px;
        border-radius: 23px;
        border: 1.5px solid var(--border-color-1);
        background-color: var(--bg-color-2);
        color: var(--text-color-1);
        font-size: 15px;
        transition: border-color .15s ease, background-color .15s ease;
        appearance: none;

        &::-webkit-search-cancel-button {
            display: none;
        }

        &::placeholder {
            color: var(--text-color-3);
        }

        &:focus {
            outline: none;
            border-color: var(--primary-color);
            background-color: var(--bg-color-1);
        }
    }

    .catalog__search-clear {
        position: absolute;
        right: 8px;
        width: 30px;
        height: 30px;
        display: grid;
        place-items: center;
        border-radius: 50%;

        &:hover {
            background-color: var(--bg-color-3);
        }
    }

    .catalog__nothing,
    .catalog__empty {
        font-size: 13px;
        color: var(--text-color-3);
        margin: 0;
        padding: 4px 2px;
    }

    .catalog__sections {
        display: flex;
        flex-direction: column;
        gap: 22px;
    }

    .catalog__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;

        @media (max-width: 767px) {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    .catalog__action {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--primary-color);
        padding: 4px 8px;
        border-radius: var(--border-radius-3);
        transition: background-color .15s ease;

        &:hover {
            background-color: var(--bg-color-2);
        }

        &:disabled {
            opacity: .5;
        }
    }
</style>
