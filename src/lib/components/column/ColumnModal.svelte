<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agents} from '$lib/stores';
    import { createEventDispatcher } from 'svelte';
    import { toast } from "svelte-sonner";
    const dispatch = createEventDispatcher();
    import { liveQuery } from 'dexie';
    import {accountsDb, db} from '$lib/db';
    import BookmarkObserver from "$lib/components/bookmark/BookmarkObserver.svelte";
    import ListObserver from "$lib/components/list/ListObserver.svelte";
    import ColumnModalChoices from "$lib/components/column/ColumnModalChoices.svelte";
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
    import OfficialListObserver from "$lib/components/list/OfficialListObserver.svelte";
    import CloudBookmarkObserver from "$lib/components/bookmark/CloudBookmarkObserver.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    const columns = getColumnState();
    let profileId = Number(localStorage.getItem('currentProfile'));

    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let currentAccount = $state();
    let profile = $state();
    let unique = $state(Symbol());

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
            dispatch('close');
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
    <Modal title={$_('column_settings')} on:close={save}>
        {#if (profile && currentAccount)}
            <div class="column-modal-account">
                <AgentsSelector _agent={$agents.get(currentAccount)} on:select={handleSelect}></AgentsSelector>
            </div>
        {/if}

        <div class="column-group-wrap">
            <div class="column-group">
                {#key currentAccount}
                    {#key unique}
                        <ColumnModalChoices
                                _agent={$agents.get(currentAccount)}
                                on:add={handleColumnAdd}
                        ></ColumnModalChoices>
                    {/key}
                {/key}
            </div>
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
</style>