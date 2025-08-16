<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {linkWarning} from "$lib/stores";
  let dialog = $state();

  $effect(() => {
      if (dialog) {
          dialog.open();
      }
  })

  function handleOk(uri) {
      window.open(uri);
      linkWarning.set(undefined);
  }

  function handleCancel() {
      linkWarning.set(undefined);
  }
</script>

{#if $linkWarning}
  <ConfirmModal
      bind:this={dialog}
      on:ok={() => {handleOk($linkWarning)}}
      on:cancel={handleCancel}
      confirmationName="linkWarningConfirmSkip"
      yesText="{m.open()}"
      cancelText="{m.cancel()}"
  >
    <h3 class="modal-title modal-title--smaller modal-title--center">{m.link_warning_confirm_title()}</h3>
    <p class="modal-text modal-text--flex">{$linkWarning}</p>
  </ConfirmModal>
{/if}