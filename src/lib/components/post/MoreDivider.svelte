<script lang="ts">
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  let el;

  function handleClick() {
      const posFromBottom = window.innerHeight - el.getBoundingClientRect().bottom;
      dispatch('click', {pos: posFromBottom});
  }
</script>

<button
    class="more-divider"
    on:click={handleClick}
    bind:this={el}
    aria-label="Road More..."
>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
</button>