<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import { _ } from 'tokimeki-i18n';

  let { title = undefined }: { title?: string } = $props();
</script>

<div class="column-heading">
  <div class="column-heading__buttons">
    <button class="settings-back" onclick={() => {history.back()}}>
      <ArrowLeft color="var(--text-color-1)" />
    </button>
  </div>

  <h1 class="column-heading__title">{title ?? $_('atmosphere')}</h1>

  <div class="column-heading__buttons column-heading__buttons--right">
    <a class="settings-back" href="/">
      <X color="var(--text-color-1)" />
    </a>
  </div>
</div>
