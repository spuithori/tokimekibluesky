<script lang="ts">
    import Unplug from '@lucide/svelte/icons/unplug';
  import {_} from "svelte-i18n";

  let { column } = $props();

</script>

<div class="column-agent-missing">
  <div class="modal-heading-icon">
    <Unplug size={48} color="var(--danger-color)" />
  </div>

  <h1 class="modal-title modal-title--smaller modal-title--center">{$_('profile_account_missing_title')}</h1>

  {#if column.handle}
    <p class="modal-text modal-text--center">{$_('column_account_missing_text_1', {values: {name: column.handle}})}</p>
  {:else}
    <p class="modal-text modal-text--center">{$_('column_account_missing_text_2')}</p>
  {/if}

  <p class="text-center">
    <a href="/settings/profiles/" class="button">{$_('settings_profiles')}</a>
  </p>
</div>

<style lang="postcss">
  .column-agent-missing {
      padding: 50px 30px;
  }
</style>