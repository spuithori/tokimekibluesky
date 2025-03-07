<script lang="ts">
  interface Props {
    size?: number;
    padding?: number;
    strokeWidth?: number;
    color?: string;
  }

  let { size = 24, padding = 32, strokeWidth = 5, color = 'var(--primary-color)' }: Props = $props();
</script>

<div class="spinner-container" style="--spinner-size: {size}px; --spinner-stroke-width: {strokeWidth}px; --spinner-color: {color}; --spinner-padding: {padding}px">
  <svg class="spinner" viewBox="0 0 50 50">
    <circle class="path" cx="25" cy="25" r="20" fill="none" />
  </svg>
</div>

<style lang="postcss">
    .spinner-container {
        --spinner-animation-duration: 1.333s;

        margin: var(--spinner-padding);
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .spinner {
        animation: rotate var(--spinner-animation-duration) linear infinite;
        width: var(--spinner-size);
        height: var(--spinner-size);
    }

    .path {
        stroke: var(--spinner-color);
        stroke-width: var(--spinner-stroke-width);
        stroke-linecap: round;
        animation: dash var(--spinner-animation-duration) ease-in-out infinite;
        stroke-dasharray: 1, 200;
        stroke-dashoffset: 0;
    }

    @keyframes rotate {
        100% {
            transform: rotate(360deg);
        }
    }

    @keyframes dash {
        0% {
            stroke-dasharray: 1, 200;
            stroke-dashoffset: 0;
        }
        50% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -35px;
        }
        100% {
            stroke-dasharray: 90, 200;
            stroke-dashoffset: -124px;
        }
    }
</style>