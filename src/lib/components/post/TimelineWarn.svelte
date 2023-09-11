<script lang="ts">
  import {_} from "svelte-i18n";
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  export let reason;

  function handleClick() {
      dispatch('visible');
  }
</script>

<div class="timeline-warn">
  <div class="timeline-warn-heading">
    <p class="timeline-warn-title"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></p>
    <ul class="timeline-warn-list">
      <li>{$_('labeling_' + reason)}</li>
    </ul>
  </div>

  <div class="timeline-warn-button">
    <button class="button button--sm" on:click={handleClick}>{$_('show_button')}</button>
  </div>
</div>