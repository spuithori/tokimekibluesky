<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div class="column-heading" data-testid="sticky-header">
  <span class="column-heading__title">Thread</span>
</div>

<div class="deck-heading" data-testid="sticky-header-2">
  <span class="deck-heading__title">Replies</span>
</div>

<div class="page-content" data-testid="page-content">
  {@render children()}
</div>

<style>
  :global(html) {
    scroll-behavior: auto !important;
  }

  :global(body) {
    margin: 0;
    padding: 0;
  }

  .column-heading {
    height: 56px;
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background-color: #f8f8f8;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 11;
    font-family: monospace;
    font-weight: bold;
    font-size: 14px;
  }

  .deck-heading {
    height: 52px;
    position: sticky;
    top: 56px;
    left: 0;
    right: 0;
    background-color: #eee;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 10;
    font-family: monospace;
    font-weight: bold;
    font-size: 13px;
  }

  .page-content {
    position: relative;
    width: 740px;
    margin: 0 auto;
  }
</style>
