<script lang="ts">
    import {_} from "svelte-i18n";
    import {agent, settings} from "$lib/stores";
    import Notification from "../Notification.svelte";

</script>

<div class="modal-page modal-page--{$settings.design?.layout}">
  <div class="modal-page-content">
    <div class="column-heading">
      <div class="column-heading__buttons">
        <button class="settings-back" on:click={() => {history.back()}}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
      </div>

      <h2 class="column-heading__title">{$_('notifications')}</h2>

      <div class="column-heading__buttons column-heading__buttons--right">
        <a class="settings-back" href="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </a>
      </div>
    </div>

    <div class="timeline">
      <Notification isPage={true}></Notification>
    </div>
  </div>
</div>

<style lang="postcss">

</style>