<script lang="ts">
  let { handle, color = 'var(--text-color-1)' } = $props();
</script>

<div class="my-profile-badge">
  {#if handle}
    <a href="/profile/{handle}">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
    </a>
  {:else}
    <span class="empty-avatar"></span>
  {/if}
</div>
