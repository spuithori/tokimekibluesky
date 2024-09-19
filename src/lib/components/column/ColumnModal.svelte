<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agents, columns, syncColumns} from '$lib/stores';
    import { createEventDispatcher } from 'svelte';
    import { toast } from "svelte-sonner";
    const dispatch = createEventDispatcher();
    import { liveQuery } from 'dexie';
    import {accountsDb, db} from '$lib/db';
    import ColumnList from "$lib/components/column/ColumnList.svelte";
    import BookmarkObserver from "$lib/components/bookmark/BookmarkObserver.svelte";
    import ListObserver from "$lib/components/list/ListObserver.svelte";
    import ColumnModalChoices from "$lib/components/column/ColumnModalChoices.svelte";
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
    import OfficialListObserver from "$lib/components/list/OfficialListObserver.svelte";
    import CloudBookmarkObserver from "$lib/components/bookmark/CloudBookmarkObserver.svelte";

    export let _columns = $syncColumns;
    export let profileId = Number(localStorage.getItem('currentProfile'));

    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let currentAccount;
    let profile;
    let unique = Symbol();

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

    function handleBookmarkClose(event) {
        if (event.detail.id) {
            _columns = _columns.filter(_column => _column.algorithm.type !== 'bookmark' || Number(_column.algorithm.algorithm) !== event.detail.id)
        }
    }

    function handleCloudBookmarkClose(event) {
        unique = Symbol();
    }

    function handleListClose(event) {
        if (event.detail.id) {
            console.log(event.detail.id)
            _columns = _columns.filter(_column => _column.algorithm.type !== 'list' || _column.algorithm.algorithm !== event.detail.id)
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
            let addedColumn = structuredClone(event.detail.column);
            addedColumn.id = self.crypto.randomUUID();

            toast.success($_('column_add_success'));
            $columns = [...$columns, addedColumn];
            // save(false);
        } catch (e) {
            console.log(e);
        }
    }

    function handleColumnRemove(event) {
        $columns = $columns.filter(column => column.id !== event.detail.column.id);
        // save(false);
    }
</script>

{#if ($agents.size > 0)}
    <div class="modal">
        <div class="modal-contents">
            <h2 class="modal-title modal-title--smaller">{$_('column_settings')}</h2>

            {#if (profile && currentAccount)}
                <div class="column-modal-account">
                    <AgentsSelector _agent={$agents.get(currentAccount)} on:select={handleSelect}></AgentsSelector>
                </div>
            {/if}

            <div class="column-group-wrap">
                <div class="column-group">
                    <div class="column-group__item">
                        {#key currentAccount}
                            {#key unique}
                                <ColumnModalChoices
                                    _agent={$agents.get(currentAccount)}
                                    on:add={handleColumnAdd}
                                ></ColumnModalChoices>
                            {/key}
                        {/key}
                    </div>

                    <div class="column-group__item column-group__item--active">
                        <h3 class="column-group__title">{$_('active_columns')}</h3>
                        <p class="column-group__description">{$_('active_columns_description')}</p>

                        <ColumnList bind:items={_columns} on:remove={handleColumnRemove} _agent={$agents.get(currentAccount)}></ColumnList>
                    </div>
                </div>
            </div>

            <div class="modal-close">
                <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
            </div>
        </div>

        <button class="modal-background-close" aria-hidden="true" on:click={save}></button>

        <BookmarkObserver on:close={handleBookmarkClose} _agent={$agents.get(currentAccount)}></BookmarkObserver>
        <CloudBookmarkObserver on:close={handleCloudBookmarkClose} _agent={$agents.get(currentAccount)}></CloudBookmarkObserver>
        <ListObserver on:close={handleListClose} _agent={$agents.get(currentAccount)}></ListObserver>
        <OfficialListObserver _agent={$agents.get(currentAccount)} on:close={handleOfficialListClose}></OfficialListObserver>
    </div>
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