<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agents} from '$lib/stores';
    import { toast } from "svelte-sonner";
    import { liveQuery } from 'dexie';
    import {accountsDb, db} from '$lib/db';
    import BookmarkObserver from "$lib/components/bookmark/BookmarkObserver.svelte";
    import ListObserver from "$lib/components/list/ListObserver.svelte";
    import ColumnChoices from "$lib/components/column/ColumnChoices.svelte";
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
    import OfficialListObserver from "$lib/components/list/OfficialListObserver.svelte";
    import CloudBookmarkObserver from "$lib/components/bookmark/CloudBookmarkObserver.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";
    import {LayoutGrid, Pin} from "lucide-svelte";
    import ColumnChoicesPinned from "$lib/components/column/ColumnChoicesPinned.svelte";

    let { onclose } = $props();

    const columns = getColumnState();
    let profileId = Number(localStorage.getItem('currentProfile'));

    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let currentAccount = $state();
    let profile = $state();
    let unique = $state(Symbol());
    let currentTab: 'all' | 'pinned' = $state('all');

    accountsDb.profiles.get(profileId)
        .then(value => {
            if (!value) {
                return false;
            }

            profile = value;
            currentAccount = profile.primary;
        });

    async function save(isClose = true) {
        try {
            onclose();
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    function handleBookmarkClose(clear: boolean, id) {
        if (clear) {
            columns.columns = columns.columns.filter(_column => _column.algorithm.type !== 'bookmark' || Number(_column.algorithm.algorithm) !== id)
        }
    }

    function handleCloudBookmarkClose(clear: boolean, id: number) {
        unique = Symbol();
    }

    function handleListClose(event) {
        if (event.detail.id) {
            console.log(event.detail.id)
            columns.columns = columns.columns.filter(_column => _column.algorithm.type !== 'list' || _column.algorithm.algorithm !== event.detail.id)
        }
    }

    function handleOfficialListClose() {
        unique = Symbol();
    }

    function handleSelect(event) {
        currentAccount = event.detail.id;
    }

    function handleColumnAdd(event) {
        try {
            let addedColumn = structuredClone($state.snapshot(event.detail.column));
            columns.add({
                ...addedColumn,
                id: self.crypto.randomUUID(),
            });

            toast.success($_('column_add_success'));
            // save(false);
        } catch (e) {
            console.log(e);
        }
    }
</script>

{#if ($agents.size > 0)}
    <Modal title={$_('column_settings')} onclose={save}>
        {#if (profile && currentAccount)}
            <div class="column-modal-account">
                <AgentsSelector _agent={$agents.get(currentAccount)} on:select={handleSelect}></AgentsSelector>
            </div>
        {/if}

        <div class="column-modal-tabs">
            <button class="column-modal-tab" class:column-modal-tab--current={currentTab === 'all'} onclick={() => {currentTab = 'all'}}>
                <LayoutGrid size="18"></LayoutGrid>
                {$_('all')}
            </button>

            <button class="column-modal-tab" class:column-modal-tab--current={currentTab === 'pinned'} onclick={() => {currentTab = 'pinned'}}>
                <Pin size="18"></Pin>
                {$_('pinned_feed')}
            </button>
        </div>

        <div class="column-group-wrap">
            {#key currentAccount}
                {#key unique}
                    {#if (currentTab === 'all')}
                        <div class="column-group">
                            <ColumnChoices _agent={$agents.get(currentAccount)} on:add={handleColumnAdd}></ColumnChoices>
                        </div>
                    {:else if (currentTab === 'pinned')}
                        <div class="column-group column-group--single">
                            <ColumnChoicesPinned _agent={$agents.get(currentAccount)} on:add={handleColumnAdd}></ColumnChoicesPinned>
                        </div>
                    {/if}
                {/key}
            {/key}
        </div>
    </Modal>

    <BookmarkObserver close={handleBookmarkClose} _agent={$agents.get(currentAccount)}></BookmarkObserver>
    <CloudBookmarkObserver close={handleCloudBookmarkClose} _agent={$agents.get(currentAccount)}></CloudBookmarkObserver>
    <ListObserver on:close={handleListClose} _agent={$agents.get(currentAccount)}></ListObserver>
    <OfficialListObserver _agent={$agents.get(currentAccount)} on:close={handleOfficialListClose}></OfficialListObserver>
{/if}

<style lang="postcss">
    .column-group {
        margin-top: 30px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        &--single {
            grid-template-columns: 1fr;
        }

        @media (max-width: 767px) {
            grid-template-columns: 1fr;
        }

        &__item {
            display: flex;
            flex-direction: column;

            &--active {
                padding: 16px;
                border-radius: 6px;
                border: 2px solid var(--primary-color);
                background-color: var(--bg-color-2);

                @media (max-width: 767px) {
                    padding: 10px;
                }
            }
        }

        &__title {
            font-size: 16px;
        }

        &__description {
            color: var(--text-color-3);
            font-size: 14px;
            margin-top: 4px;
            margin-bottom: 16px;
        }
    }

    .column-group-wrap {
        position: relative;
    }

    .column-modal-tabs {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
    }

    .column-modal-tab {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 0 8px;
        height: 40px;
        border: 2px solid var(--border-color-2);
        border-radius: var(--border-radius-2);
        color: var(--text-color-3);
        font-weight: bold;
        font-size: 14px;

        &--current {
            border-color: var(--primary-color);
            color: var(--text-color-1);
        }
    }
</style>