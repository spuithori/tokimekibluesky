<script lang="ts">
    import {_} from 'svelte-i18n';
    import {
        agents,
        columns,
    } from '$lib/stores';
    import { createEventDispatcher, onMount } from 'svelte';
    import toast from "svelte-french-toast";
    const dispatch = createEventDispatcher();
    import { liveQuery } from 'dexie';
    import {accountsDb, db} from '$lib/db';
    import ColumnList from "$lib/components/column/ColumnList.svelte";
    import spinner from '$lib/images/loading.svg';
    import FeedsObserver from "$lib/components/feeds/FeedsObserver.svelte";
    import BookmarkObserver from "$lib/components/bookmark/BookmarkObserver.svelte";
    import ListObserver from "$lib/components/list/ListObserver.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import ColumnModalAdder from "$lib/components/column/ColumnModalAdder.svelte";
    import ColumnModalChoices from "$lib/components/column/ColumnModalChoices.svelte";
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";

    export let _columns = $columns;
    export let profileId = Number(localStorage.getItem('currentProfile'));

    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let isLoading = true;
    let currentAccount;
    let profile;

    async function save() {
        try {
            _columns.map(column => delete column.scrollElement);

            const id = await accountsDb.profiles.update(profileId, {
                columns: _columns,
            });

            dispatch('close', {
                columns: _columns,
                clear: false,
            });
        } catch (e) {
            console.error(e);
            toast.error('Error: ' + e);
        }
    }

    function handleFeedsClose() {
        updateFeeds();
    }

    async function updateFeeds() {
        const agent = $agents.get(currentAccount);
        const savedFeeds = await agent.getSavedFeeds();

        console.log(savedFeeds);
    }

    function handleBookmarkClose(event) {
        if (event.detail.id) {
            _columns = _columns.filter(_column => _column.algorithm.type !== 'bookmark' || Number(_column.algorithm.algorithm) !== event.detail.id)
        }
    }

    function handleListClose(event) {
        if (event.detail.id) {
            console.log(event.detail.id)
            _columns = _columns.filter(_column => _column.algorithm.type !== 'list' || _column.algorithm.algorithm !== event.detail.id)
        }
    }

    function margeAllColumns() {
        allColumns = allColumns.filter(item => !_columns.some(column => item.algorithm.algorithm === column.algorithm.algorithm && item.algorithm.type === column.algorithm.type));
    }

    function addEmptyRealtimeSearch() {
        _columns = [..._columns, {
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'realtime',
                name: 'REALTIME(SEARCH)',
                search: '',
                algorithm: 'search',
            },
            style: 'default',
            settings: defaultDeckSettings,
        }]
    }

    let profiles = liveQuery(
        () => accountsDb.profiles.toArray()
    );

    $: {
        if ($profiles) {
            initAccounts($profiles);
        }
    }

    async function initAccounts(profiles) {
        const currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
        profile = profiles.find(profile => profile.id === currentProfile);
        currentAccount = profile.primary;
    }

    function handleSelect(event) {
        currentAccount = event.detail.id;
    }

    function handleColumnAdd(event) {
        try {
            let addedColumn = structuredClone(event.detail.column);
            addedColumn.id = self.crypto.randomUUID();

            _columns = [..._columns, addedColumn];
        } catch (e) {
            console.log(e);
        }
    }

    function handleColumnRemove(event) {
        _columns = _columns.filter(column => column.id !== event.detail.column.id);
    }

    onMount(async () => {
        // await updateFeeds();
        // margeAllColumns();

        isLoading = false;
    })
</script>

{#if ($agents.size > 0)}
    <div class="column-modal">
        <div class="column-modal-contents">
            <h2 class="column-modal-title">{$_('column_settings')}</h2>

            {#if (profile && currentAccount)}
                <div class="column-modal-account">
                    <AgentsSelector _agent={$agents.get(currentAccount)} on:select={handleSelect}></AgentsSelector>
                </div>

                <ColumnModalAdder></ColumnModalAdder>
            {/if}

            <div class="column-group-wrap">
                {#if (isLoading)}
                    <div class="column-group-loading">
                        <img src={spinner} alt="">
                    </div>
                {/if}

                <div class="column-group">
                    <div class="column-group__item">
                        {#key currentAccount}
                            <ColumnModalChoices
                                _agent={$agents.get(currentAccount)}
                                on:add={handleColumnAdd}
                            ></ColumnModalChoices>
                        {/key}
                    </div>

                    <div class="column-group__item column-group__item--active">
                        <h3 class="column-group__title">{$_('active_columns')}</h3>
                        <ColumnList bind:items={_columns} on:remove={handleColumnRemove}></ColumnList>
                    </div>
                </div>
            </div>

            <div class="column-modal-close">
                <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
            </div>
        </div>

        <button class="modal-background-close" aria-hidden="true" on:click={save}></button>

        <BookmarkObserver on:close={handleBookmarkClose} _agent={$agents.get(currentAccount)}></BookmarkObserver>
        <ListObserver on:close={handleListClose} _agent={$agents.get(currentAccount)}></ListObserver>
    </div>
{/if}

<style lang="postcss">
    .column-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .column-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .column-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 26px;
    }

    .column-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }

    .column-group {
        margin-top: 30px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;

        @media (max-width: 767px) {
            grid-template-columns: 1fr;
        }

        &__item {
            display: flex;
            flex-direction: column;

            &--active {
                padding: 20px;
                border-radius: 6px;
                border: 2px solid var(--primary-color);
                background-color: var(--base-bg-color);

                @media (max-width: 767px) {
                    padding: 10px;
                }
            }
        }

        &__title {
            margin-bottom: 20px;
        }
    }

    .column-group-wrap {
        position: relative;
    }

    .column-group-loading {
        position: absolute;
        top: -10px;
        left: -10px;
        bottom: -10px;
        right: -10px;
        background-color: var(--bg-color-1);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;

        img {
            width: 50px;
            height: 50px;
        }
    }
</style>