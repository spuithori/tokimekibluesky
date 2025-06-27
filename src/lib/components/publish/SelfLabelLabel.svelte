<script lang="ts">
  import {_} from "svelte-i18n";
  import { AlertTriangle } from 'lucide-svelte';

  let { labels } = $props();
</script>

{#each labels as label}
  <p class="self-label-label"><AlertTriangle size="16"></AlertTriangle>{$_(`labeling_${label.val}`)}</p>
{:else}
  <p class="self-label-label"><AlertTriangle size="16"></AlertTriangle>{$_(`labeling_nothing`)}</p>
{/each}

<style lang="postcss">
    .self-label-label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        padding: 4px 8px;
        background-color: var(--bg-color-2);
        color: var(--primary-color);
        font-weight: bold;
        border-radius: var(--border-radius-2);
        height: 30px;
        cursor: default;
    }
</style>