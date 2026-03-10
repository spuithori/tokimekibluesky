<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="detail-page" data-testid="detail-page">
  <h2 data-testid="detail-id">{$page.params.id}</h2>
  <p>This is the detail page for {$page.params.id}</p>
  <p>Some detail content goes here.</p>
</div>

<style>
  .detail-page {
    padding: 24px;
    font-family: monospace;
  }

  h2 {
    font-size: 18px;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: #555;
    line-height: 1.6;
  }
</style>
