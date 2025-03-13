<script lang="ts">
  import {AlertTriangle} from "lucide-svelte";

  let { text } = $props();
</script>

<p class="notice">
  <AlertTriangle size="20" color="var(--primary-color)"></AlertTriangle>
  {text}
</p>

<style lang="postcss">
    .notice {
        padding: 8px 10px 4px;
        border-radius: 4px;
        background-color: var(--bg-color-2);
        border: 1px solid var(--border-color-2);
        display: grid;
        grid-template-columns: 20px 1fr;
        gap: 8px;
        font-size: 14px;
        margin: 8px 0;
    }
</style>