<script lang="ts">
    import IconColumnsFeed from "$lib/icons/columns/IconColumnsFeed.svelte";
    import IconColumnsList from "$lib/icons/columns/IconColumnsList.svelte";
    import IconColumnsBookmark from "$lib/icons/columns/IconColumnsBookmark.svelte";
    import IconColumnsHome from "$lib/icons/columns/IconColumnsHome.svelte";
    import {bookmarkModal, cloudBookmarkModal, listModal, officialListModal} from "$lib/stores";
    import IconColumnsEdit from "$lib/icons/columns/IconColumnsEdit.svelte";
    import IconColumnsNotification from "$lib/icons/columns/IconColumnsNotification.svelte";
    import {createEventDispatcher} from "svelte";
    import IconColumnsLike from "$lib/icons/columns/IconColumnsLike.svelte";
    import IconColumnsMyPost from "$lib/icons/columns/IconColumnsMyPost.svelte";
    import IconColumnsMyMedia from "$lib/icons/columns/IconColumnsMyMedia.svelte";
    import IconColumnsAuthor from "$lib/icons/columns/IconColumnsAuthor.svelte";

    const dispatch = createEventDispatcher();
    export let items;
    export let _agent;

    function addColumn(column) {
        dispatch('add', {
            column: column,
        });
    }
</script>

<div class="column-list">
    {#each items as column, index (column.id)}
        <div class="column-list__item">
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

            {#if (column.algorithm.type === 'custom')}
                <IconColumnsFeed></IconColumnsFeed>
            {:else if (column.algorithm.type === 'list')}
                <IconColumnsList></IconColumnsList>
                <button
                        class="algo-nav-edit"
                        on:click={() => {listModal.set({open: true, data: column.algorithm.algorithm })}}
                        aria-label="Edit list"
                >
                    <IconColumnsEdit></IconColumnsEdit>
                </button>
            {:else if (column.algorithm.type === 'bookmark')}
                <IconColumnsBookmark></IconColumnsBookmark>
                <button
                        class="algo-nav-edit"
                        on:click={() => {bookmarkModal.set({open: true, data: Number(column.algorithm.algorithm) })}}
                        aria-label="Edit Bookmark"
                >
                    <IconColumnsEdit></IconColumnsEdit>
                </button>
            {:else if (column.algorithm.type === 'cloudBookmark')}
                <IconColumnsBookmark></IconColumnsBookmark>
                <button
                        class="algo-nav-edit"
                        on:click={() => {cloudBookmarkModal.set({open: true, data: column.algorithm.algorithm })}}
                        aria-label="Edit Bookmark"
                >
                    <IconColumnsEdit></IconColumnsEdit>
                </button>
            {:else if (column.algorithm.type === 'notification')}
                <IconColumnsNotification></IconColumnsNotification>
            {:else if (column.algorithm.type === 'officialList')}
                <IconColumnsList></IconColumnsList>
                <button
                        class="algo-nav-edit"
                        on:click={() => {$officialListModal = {open: true, uri: column.algorithm.algorithm}}}
                        aria-label="Edit list"
                >
                    <IconColumnsEdit></IconColumnsEdit>
                </button>
            {:else if (column.algorithm.type === 'like')}
                <IconColumnsLike></IconColumnsLike>
            {:else if (column.algorithm.type === 'myPost')}
                <IconColumnsMyPost></IconColumnsMyPost>
            {:else if (column.algorithm.type === 'myMedia')}
                <IconColumnsMyMedia></IconColumnsMyMedia>
            {:else if (column.algorithm.type === 'author')}
                <IconColumnsAuthor></IconColumnsAuthor>
            {:else}
                <IconColumnsHome></IconColumnsHome>
            {/if}

            <button class="column-list__add" on:click={() => {addColumn(column)}} aria-label="Add"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></button>
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
            padding: 6px 10px 6px 40px;
            box-shadow: 0 0 6px var(--box-shadow-color-1);
            border-radius: 6px;
            font-weight: bold;
            background-color: var(--bg-color-1);
            cursor: default;
            min-width: 0;
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
</style>