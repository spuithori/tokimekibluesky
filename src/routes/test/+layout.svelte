<script lang="ts">
  import '@fontsource-variable/inter';
  let { children } = $props();
</script>

{@render children?.()}

<style>
  :global(body) {
    margin: 0;
    font-family: 'Inter Variable', system-ui, sans-serif;
    color: #1a1a1a;
    background: #fafafa;
  }
</style>
