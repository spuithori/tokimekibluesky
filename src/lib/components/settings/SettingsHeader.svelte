<script lang="ts">
  import { getContext } from 'svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import { SETTINGS_COLUMN_HOST } from '$lib/settings/pagesRegistry';

  let { children } = $props();
  const hosted = getContext(SETTINGS_COLUMN_HOST);
</script>

{#if !hosted}
<div class="column-heading">
  <div class="column-heading__buttons">
    <button class="settings-back" onclick={() => {history.back()}}>
      <ArrowLeft size="24" color="var(--text-color-1)"></ArrowLeft>
    </button>
  </div>

  <h1 class="column-heading__title">
    {@render children?.()}
  </h1>

  <div class="column-heading__buttons column-heading__buttons--right">
    <a class="settings-back" href="/">
      <X size="24" color="var(--text-color-1)"></X>
    </a>
  </div>
</div>
{/if}