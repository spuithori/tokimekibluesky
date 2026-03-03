<script lang="ts">
    import {agent, starterPackModal} from "$lib/stores";
    import StarterPackModal from "$lib/components/starterpack/StarterPackModal.svelte";

  interface Props {
    _agent?: any;
    onclose?: () => void;
  }

  let { _agent = $agent, onclose = () => {} }: Props = $props();

    function handleClose() {
        $starterPackModal = {
            open: false,
            uri: '',
        }

        onclose();
    }
</script>

{#if ($starterPackModal.open)}
  <StarterPackModal {_agent} uri={$starterPackModal.uri} onclose={handleClose}></StarterPackModal>
{/if}
