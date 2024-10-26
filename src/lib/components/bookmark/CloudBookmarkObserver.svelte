<script lang="ts">
  import {agent, cloudBookmarkModal} from "$lib/stores";
  import CloudBookmarkModal from "$lib/components/bookmark/CloudBookmarkModal.svelte";
  let bookmark = undefined;

  let { _agent = $agent, close } = $props();

  function handleBookmarkClose(clear: boolean, id: number) {
      $cloudBookmarkModal.open = false;
      close(clear, id);
  }
</script>

{#if ($cloudBookmarkModal.open)}
  <CloudBookmarkModal id={$cloudBookmarkModal.data} close={handleBookmarkClose} {_agent}></CloudBookmarkModal>
{/if}