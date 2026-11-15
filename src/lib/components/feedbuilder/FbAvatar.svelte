<script lang="ts">
  interface Props {
    src?: string | null;
    handle?: string;
    size?: number;
    eager?: boolean;
  }
  let { src, handle = '', size = 44, eager = false }: Props = $props();

  const initial = $derived(handle.trim().charAt(0).toUpperCase() || '?');

  const HUES = ['pink', 'peri', 'mint', 'sky', 'cream'] as const;
  function hueForHandle(h: string): (typeof HUES)[number] {
    let hash = 0;
    for (let i = 0; i < h.length; i++) hash = (hash * 31 + h.charCodeAt(i)) | 0;
    return HUES[Math.abs(hash) % HUES.length];
  }

  const hue = $derived(hueForHandle(handle || 'x'));
  const radius = $derived(Math.max(10, size * 0.28));
  const fontSize = $derived(Math.floor(size * 0.38));
</script>

<div
  class="avatar avatar--hue-{hue}"
  style="--avatar-size:{size}px;--avatar-radius:{radius}px;--avatar-font:{fontSize}px;"
>
  {#if src}
    <img class="avatar__img" {src} alt="" width={size} height={size} decoding="async" loading={eager ? 'eager' : 'lazy'} />
  {:else}
    <span class="avatar__fallback" aria-hidden="true">{initial}</span>
  {/if}
</div>

<style lang="postcss">
  .avatar {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: var(--avatar-size);
    height: var(--avatar-size);
    border-radius: var(--avatar-radius);
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid var(--hairline);
    font-family: var(--code-font);
    font-weight: 600;
    font-size: var(--avatar-font);
    color: var(--text-color-1);
    letter-spacing: -0.01em;
    user-select: none;

    @media (max-width: 767px) {
      max-width: 100%;
      aspect-ratio: 1 / 1;
      height: auto;
    }
  }

  .avatar--hue-pink  { background: var(--color-pink-soft); }
  .avatar--hue-peri  { background: var(--color-peri-soft); }
  .avatar--hue-mint  { background: var(--color-mint-soft); }
  .avatar--hue-sky   { background: var(--color-sky-soft); }
  .avatar--hue-cream { background: var(--color-cream-soft); }

  .avatar__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar__fallback {
    line-height: 1;
  }
</style>
