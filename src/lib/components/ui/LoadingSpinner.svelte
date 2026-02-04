<script lang="ts">
  interface Props {
    size?: number;
    padding?: number;
    strokeWidth?: number;
    color?: string;
  }

  let { size = 24, padding = 32, strokeWidth = 3, color = 'var(--primary-color)' }: Props = $props();
</script>

<div class="spinner-container" style="--spinner-size: {size}px; --spinner-stroke-width: {strokeWidth}px; --spinner-color: {color}; --spinner-padding: {padding}px">
  <div class="spinner"></div>
</div>

<style lang="postcss">
    .spinner-container {
        margin: var(--spinner-padding);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .spinner {
        width: var(--spinner-size);
        height: var(--spinner-size);
        border-radius: 50%;
        background: conic-gradient(transparent 30%, var(--spinner-color));
        mask: radial-gradient(farthest-side, transparent calc(100% - var(--spinner-stroke-width)), #000 calc(100% - var(--spinner-stroke-width)));
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - var(--spinner-stroke-width)), #000 calc(100% - var(--spinner-stroke-width)));
        animation: rotate 0.8s linear infinite;
    }

    @keyframes rotate {
        100% {
            transform: rotate(360deg);
        }
    }
</style>