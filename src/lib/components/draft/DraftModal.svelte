<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { agent } from "$lib/stores";
  import Modal from "$lib/components/ui/Modal.svelte";
  import DraftList from "$lib/components/draft/DraftList.svelte";

  let { _agent = $agent, onuse, onclose } = $props();
</script>

<Modal title={$_('drafts')} {onclose}>
  <DraftList {_agent} {onuse}></DraftList>
</Modal>
