<script lang="ts">
  interface Props {
    size?: number;
    padding?: number;
    color?: string;
  }

  let { size = 24, padding = 32, color = 'var(--text-color-1)' }: Props = $props();
</script>

<div class="loading-spinner" style="padding: {padding}px">
  <svg width="{size}" height="{size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2,12A11.2,11.2,0,0,1,13,1.05C12.67,1,12.34,1,12,1a11,11,0,0,0,0,22c.34,0,.67,0,1-.05C6,23,2,17.74,2,12Z" fill={color}><animateTransform attributeName="transform" type="rotate" dur="0.6s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg>
</div>

<style lang="postcss">
  .loading-spinner {
      display: flex;
      justify-content: center;
  }
</style>