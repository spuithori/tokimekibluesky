<script lang="ts">
    import {agent, officialListModal} from "$lib/stores";
    import OfficialListModal from "$lib/components/list/OfficialListModal.svelte";

  interface Props {
    _agent?: any;
    purpose?: string;
    onclose?: () => void;
  }

  let { _agent = $agent, purpose = 'app.bsky.graph.defs#curatelist', onclose }: Props = $props();

    function handleListClose() {
        $officialListModal = {
            open: false,
            uri: '',
        }

        onclose?.();
    }
</script>

{#if ($officialListModal.open)}
  <OfficialListModal {_agent} {purpose} uri={$officialListModal.uri} onclose={handleListClose}></OfficialListModal>
{/if}