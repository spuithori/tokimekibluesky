<script lang="ts">
  let { onDividerClick } = $props();
  let el = $state();

  function handleClick() {
      const posFromBottom = window.innerHeight - el.getBoundingClientRect().bottom;
      onDividerClick(posFromBottom);
  }
</script>

<button
    class="more-divider"
    onclick={handleClick}
    bind:this={el}
    aria-label="Road More..."
>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-more-horizontal"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
</button>