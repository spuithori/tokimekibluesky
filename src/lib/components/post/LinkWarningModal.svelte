<script lang="ts">
  import {_} from "svelte-i18n";
  import ConfirmModal from "$lib/components/ui/ConfirmModal.svelte";
  import {linkWarning} from "$lib/stores";
  let dialog;

  function handleOk(uri) {
      window.open(uri);
      linkWarning.set(undefined);
  }

  function handleCancel() {
      linkWarning.set(undefined);
  }

  $: {
      if (dialog) {
          dialog.open();
      }
  }
</script>

{#if $linkWarning}
  <ConfirmModal
      bind:this={dialog}
      on:ok={() => {handleOk($linkWarning)}}
      on:cancel={handleCancel}
      confirmationName="linkWarningConfirmSkip"
      yesText="{$_('open')}"
      cancelText="{$_('cancel')}"
  >
    <h3 class="modal-title modal-title--smaller modal-title--center">{$_('link_warning_confirm_title')}</h3>
    <p class="modal-text modal-text--flex">{$linkWarning}</p>
  </ConfirmModal>
{/if}