<script lang="ts">
  import {_} from "svelte-i18n";

  let { column } = $props();

</script>

<div class="column-agent-missing">
  <div class="modal-heading-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unplug"><path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/></svg>
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