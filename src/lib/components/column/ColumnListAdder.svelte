<script lang="ts">
    import {bookmarkModal, cloudBookmarkModal, listModal, officialListModal} from "$lib/stores";
    import IconColumnsEdit from "$lib/icons/columns/IconColumnsEdit.svelte";
    import {createEventDispatcher} from "svelte";
    import {Bell, Bookmark, Heart, Home, Image, List, Newspaper, Pencil, PlusCircle, UserRound, MessageCircle} from "lucide-svelte";

    const dispatch = createEventDispatcher();
    let { items, _agent } = $props();

    function addColumn(column) {
        dispatch('add', {
            column: column,
        });
    }
</script>

<div class="column-list">
    {#each items as column, index (column.id)}
        <div class="column-list__item">
            <div class="column-list__icon">
                {#if (column.algorithm.type === 'custom')}
                    <Newspaper size="20" color="var(--text-color-1)"></Newspaper>
                {:else if (column.algorithm.type === 'list')}
                    <List size="20" color="var(--text-color-1)"></List>
                    <button
                            class="algo-nav-edit"
                            onclick={() => {listModal.set({open: true, data: column.algorithm.algorithm })}}
                            aria-label="Edit list"
                    >
                        <IconColumnsEdit></IconColumnsEdit>
                    </button>
                {:else if (column.algorithm.type === 'bookmark')}
                    <Bookmark size="20" color="var(--text-color-1)"></Bookmark>
                    <button
                            class="algo-nav-edit"
                            onclick={() => {bookmarkModal.set({open: true, data: Number(column.algorithm.algorithm) })}}
                            aria-label="Edit Bookmark"
                    >
                        <IconColumnsEdit></IconColumnsEdit>
                    </button>
                {:else if (column.algorithm.type === 'cloudBookmark')}
                    <Bookmark size="20" color="var(--text-color-1)"></Bookmark>
                    <button
                            class="algo-nav-edit"
                            onclick={() => {cloudBookmarkModal.set({open: true, data: column.algorithm.algorithm })}}
                            aria-label="Edit Bookmark"
                    >
                        <IconColumnsEdit></IconColumnsEdit>
                    </button>
                {:else if (column.algorithm.type === 'officialBookmark')}
                    <Bookmark size="20" color="var(--text-color-1)"></Bookmark>
                {:else if (column.algorithm.type === 'notification')}
                    <Bell size="20" color="var(--text-color-1)"></Bell>
                {:else if (column.algorithm.type === 'officialList')}
                    <List size="20" color="var(--text-color-1)"></List>
                    <button
                            class="algo-nav-edit"
                            onclick={() => {$officialListModal = {open: true, uri: column.algorithm.algorithm}}}
                            aria-label="Edit list"
                    >
                        <IconColumnsEdit></IconColumnsEdit>
                    </button>
                {:else if (column.algorithm.type === 'like')}
                    <Heart size="20" color="var(--text-color-1)"></Heart>
                {:else if (column.algorithm.type === 'myPost')}
                    <Pencil size="20" color="var(--text-color-1)"></Pencil>
                {:else if (column.algorithm.type === 'myMedia')}
                    <Image size="20" color="var(--text-color-1)"></Image>
                {:else if (column.algorithm.type === 'author')}
                    <UserRound size="20" color="var(--text-color-1)"></UserRound>
                {:else if (column.algorithm.type === 'chatList')}
                    <MessageCircle size="20" color="var(--text-color-1)"></MessageCircle>
                {:else}
                    <Home size="20" color="var(--text-color-1)"></Home>
                {/if}
            </div>

            <div class="column-list__content">
                <p class="column-list__title">
                    {column.algorithm.name}
                </p>

                {#if (column.handle)}
                    <p class="column-list__handle">
                        {column.handle}
                    </p>
                {/if}
            </div>

            <button class="column-list__add" onclick={() => {addColumn(column)}} aria-label="Add"><PlusCircle color="var(--text-color-1)"></PlusCircle></button>
        </div>
    {/each}
</div>

<style lang="postcss">
    .column-list {
        display: grid;
        gap: 12px;
        grid-auto-rows: min-content;
        height: 100%;

        &__item {
            position: relative;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: bold;
            background-color: var(--bg-color-1);
            cursor: default;
            min-width: 0;
            border: 2px solid var(--border-color-1);
        }

        &__content {
            flex: 1;
        }

        &__title {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: auto;
            font-size: 14px;
            line-height: 1.3;
        }

        &__handle {
            font-size: 12px;
            color: var(--text-color-3);
            line-height: 1.2;
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }

    .algo-nav-edit {
        position: absolute;
        right: 44px;
        top: 0;
        bottom: 0;
        margin: auto;
    }
</style>