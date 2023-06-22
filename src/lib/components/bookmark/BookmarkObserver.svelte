<script lang="ts">
    import { bookmarkModal } from "$lib/stores";
    import BookmarkModal from "$lib/components/bookmark/BookmarkModal.svelte";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    let bookmark = undefined;

    function handleBookmarkClose(event) {
        $bookmarkModal.open = false;
        dispatch('close', event.detail);
    }
</script>

{#if ($bookmarkModal.open)}
  <BookmarkModal id={$bookmarkModal.data} on:close={handleBookmarkClose}></BookmarkModal>
{/if}