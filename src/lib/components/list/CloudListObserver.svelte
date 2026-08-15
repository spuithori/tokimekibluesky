<script lang="ts">
  import {agent, cloudListModal} from "$lib/stores";
  import CloudListModal from "$lib/components/list/CloudListModal.svelte";

  let { _agent = $agent, close } = $props();

  function handleClose(clear: boolean, id: number) {
      $cloudListModal.open = false;
      close(clear, id);
  }
</script>

{#if ($cloudListModal.open)}
  <CloudListModal id={$cloudListModal.data} close={handleClose} {_agent}></CloudListModal>
{/if}
