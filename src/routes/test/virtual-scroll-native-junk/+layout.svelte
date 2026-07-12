<script lang="ts">
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
</script>

<div
  class="modal-page-content"
  data-testid="scroll-container"
>
  <div class="deck-heading" data-testid="sticky-header">
    <span class="deck-heading__title">Profile Feed</span>
  </div>

  <div class="deck-row-content">
    {@render children()}
  </div>
</div>

<style>
  .modal-page-content {
    width: 740px;
    height: 600px;
    overflow-y: scroll;
    margin: 20px auto;
    background: #fff;
    border: 2px solid #333;
    position: relative;
  }

  .deck-heading {
    height: 52px;
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    background-color: #f8f8f8;
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    padding: 0 16px;
    z-index: 10;
    font-family: monospace;
    font-weight: bold;
    font-size: 14px;
  }

  .deck-row-content {
    position: relative;
  }
</style>
