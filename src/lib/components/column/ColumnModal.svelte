<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agent, columns, userLists, timelines, cursors} from '$lib/stores';
    import { createEventDispatcher, onMount } from 'svelte';
    import toast from "svelte-french-toast";
    const dispatch = createEventDispatcher();
    import { liveQuery } from 'dexie';
    import { db } from '$lib/db';
    import ColumnList from "$lib/components/column/ColumnList.svelte";

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

    onMount(async () => {
        savedFeeds = await $agent.getSavedFeeds();

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
        })

        $bookmarks.forEach(bookmark => {
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
        })

        $userLists.forEach(list => {
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
        })

        allColumns = allColumns.filter(item => !$columns.some(column => item.algorithm.algorithm === column.algorithm.algorithm && item.algorithm.type === column.algorithm.type));
        //allColumns = allColumns.filter(item => $columns.some(column => item.algorithm.type === column.algorithm.type ));

        console.log(allColumns)
        isLoading = false;
    })
</script>

<div class="column-modal">
  <div class="column-modal-contents">
    <h2 class="column-modal-title">{$_('column_settings')}</h2>

    <div class="column-group">
      <ColumnList items={allColumns}></ColumnList>
      <ColumnList bind:items={_columns}></ColumnList>
    </div>

    <div class="column-modal-close">
      <button class="button button--sm" on:click={save}>{$_('close_button')}</button>
    </div>
  </div>
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

    .column-list {
        display: grid;
        gap: 15px;

        &__item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px;
            box-shadow: 0 0 10px var(--box-shadow-color-1);
            border-radius: 6px;
        }
    }

    .column-group-title {
        margin-bottom: 15px;
    }

    .column-group {
        margin-top: 30px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
</style>