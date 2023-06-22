<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agent, columns, userLists, timelines, cursors, listModal, bookmarkModal, feedsModal} from '$lib/stores';
    import { createEventDispatcher, onMount } from 'svelte';
    import toast from "svelte-french-toast";
    const dispatch = createEventDispatcher();
    import { liveQuery } from 'dexie';
    import { db } from '$lib/db';
    import ColumnList from "$lib/components/column/ColumnList.svelte";
    import spinner from '$lib/images/loading.svg';
    import FeedsObserver from "$lib/components/feeds/FeedsObserver.svelte";
    import BookmarkObserver from "$lib/components/bookmark/BookmarkObserver.svelte";
    import ListObserver from "$lib/components/list/ListObserver.svelte";

    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let isLoading = true;

    let _columns = $columns;
    let allColumns = [
        {
            id: 1,
            algorithm: {
                type: 'default',
                name: 'HOME',
            },
            style: 'default',
        },
    ];
    if ($agent.agent.service.host === 'bsky.social') {
        allColumns = [...allColumns, {
            id: 2,
            algorithm: {
                type: 'realtime',
                name: 'REALTIME',
            },
            style: 'default',
        },]
    }
    let savedFeeds = [];



    function save() {
        try {
            $columns = _columns;
            $timelines = [];
            $cursors = [];

            dispatch('close', {
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

    $: updateBookmark($bookmarks);
    $: updateList($userLists);

    function updateBookmark(bookmarks) {
        if (!bookmarks) {
            return false;
        }

        allColumns = allColumns.filter(column => column.algorithm.type !== 'bookmark');

        bookmarks.forEach(bookmark => {
            if (bookmark.owner === $agent.did()) {
                allColumns = [...allColumns, {
                    id: self.crypto.randomUUID(),
                    algorithm: {
                        type: 'bookmark',
                        algorithm: String(bookmark.id),
                        name: bookmark.name,
                        list: String(bookmark.id),
                    },
                    style: 'default',
                }]
            }
        });

        margeAllColumns();
    }

    function updateList(lists) {
        if (!lists) {
            return false;
        }

        allColumns = allColumns.filter(column => column.algorithm.type !== 'list');

        lists.forEach(list => {
            if (list.owner === $agent.did()) {
                allColumns = [...allColumns, {
                    id: self.crypto.randomUUID(),
                    algorithm: {
                        type: 'list',
                        algorithm: String(list.id),
                        name: list.name,
                        list: String(list.id),
                    },
                    style: 'default',
                }]
            }
        });

        margeAllColumns();
    }

    async function updateFeeds() {
        savedFeeds = await $agent.getSavedFeeds();

        if (allColumns.length) {
            allColumns = allColumns.filter(column => column.algorithm.type !== 'custom');
        }

        savedFeeds.forEach(feed => {
            allColumns = [...allColumns, {
                id: self.crypto.randomUUID(),
                algorithm: {
                    type: 'custom',
                    algorithm: feed.uri,
                    name: feed.name,
                },
                style: 'default',
            }]
        });

        margeAllColumns();
    }

    function margeAllColumns() {
        allColumns = allColumns.filter(item => !_columns.some(column => item.algorithm.algorithm === column.algorithm.algorithm && item.algorithm.type === column.algorithm.type));
    }

    onMount(async () => {
        await updateFeeds();
        margeAllColumns();

        console.log(allColumns)
        isLoading = false;
    })
</script>

<div class="column-modal">
  <div class="column-modal-contents">
    <h2 class="column-modal-title">{$_('column_settings')}</h2>

    <div class="column-add-buttons">
      <button class="column-add-button" on:click={() => {listModal.set({open: true, data: undefined })}}>{$_('create_list')}</button>
      <button class="column-add-button" on:click={() => {bookmarkModal.set({open: true, data: undefined})}}>{$_('create_bookmark')}</button>
      <button class="column-add-button" on:click={() => {$feedsModal.open = true}}>{$_('open_feed_store')}</button>
    </div>

    <div class="column-group-wrap">
      {#if (isLoading)}
        <div class="column-group-loading">
          <img src={spinner} alt="">
        </div>
      {/if}

      <div class="column-group">
        <div class="column-group__item">
          <ColumnList items={allColumns}></ColumnList>
        </div>

        <div class="column-group__item column-group__item--active">
          <h3 class="column-group__title">{$_('active_columns')}</h3>
          <ColumnList bind:items={_columns}></ColumnList>
        </div>
      </div>
    </div>

    <div class="column-modal-close">
      <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
    </div>
  </div>

  <FeedsObserver on:close={handleFeedsClose}></FeedsObserver>
  <BookmarkObserver on:close={handleBookmarkClose}></BookmarkObserver>
  <ListObserver on:close={handleListClose}></ListObserver>
</div>

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

    .column-add-buttons {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;

        @media (max-width: 767px) {
            gap: 10px;
        }
    }

    .column-add-button {
        display: grid;
        place-content: center;
        height: 40px;
        width: 100%;
        background-color: var(--bg-color-1);
        box-shadow: 0 0 10px var(--box-shadow-color-1);
        border-radius: 6px;
        font-weight: 600;

        @media (max-width: 767px) {
            font-size: 12px;
            letter-spacing: -.05em;
        }
    }
</style>