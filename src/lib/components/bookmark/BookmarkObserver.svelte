<script lang="ts">
  import {agent, bookmarkModal} from "$lib/stores";
  import BookmarkModal from "$lib/components/bookmark/BookmarkModal.svelte";
  let bookmark = undefined;

  let { _agent = $agent, close } = $props();

  function handleBookmarkClose(clear: boolean) {
      $bookmarkModal.open = false;
      close(clear);
  }
</script>

{#if ($bookmarkModal.open)}
  <BookmarkModal id={$bookmarkModal.data} close={handleBookmarkClose} {_agent}></BookmarkModal>
{/if}