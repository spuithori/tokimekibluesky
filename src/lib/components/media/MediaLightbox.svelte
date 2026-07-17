<script lang="ts">
  import Save from '@lucide/svelte/icons/save';
  import X from '@lucide/svelte/icons/x';
  import { onDestroy } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import { Lightbox, ToolbarButton, type Slide, type Viewer } from 'picola/svelte';
  import 'picola/picola.css';
  import ImageAlt from '$lib/components/utils/ImageAlt.svelte';
  import { parseCdnUrl, fetchOriginalBlob } from '$lib/util';

  type Meta = { downloadName?: string };

  let { images = [], index = $bindable(0), viewer = $bindable(null), onuichange, onclose }: {
    images: { thumb: string; fullsize: string; alt?: string; aspectRatio?: { width: number; height: number } }[];
    index?: number;
    viewer?: Viewer<Meta> | null;
    onuichange?: (visible: boolean) => void;
    onclose?: () => void;
  } = $props();

  const objectUrls: string[] = [];
  let uiVisible = $state(true);
  let stripOverflowing = $state(false);

  const slides = $derived(
    images.map(
      (image): Slide<Meta> => ({
        src: image.fullsize,
        placeholder: image.thumb,
        width: image.aspectRatio?.width,
        height: image.aspectRatio?.height,
        alt: image.alt
      })
    )
  );

  function mimeToExt(type: string): string {
    switch (type.split(';')[0].trim()) {
      case 'image/png': return 'png';
      case 'image/gif': return 'gif';
      case 'image/webp': return 'webp';
      case 'image/avif': return 'avif';
      case 'image/jpeg':
      default: return 'jpg';
    }
  }

  function triggerDownload(url: string, filename: string) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function download(slide: Slide<Meta> | undefined) {
    if (!slide) return;
    const parsed = parseCdnUrl(slide.src);
    if (!parsed) {
      window.open(slide.src, '_blank', 'noopener');
      return;
    }

    try {
      const result = await fetchOriginalBlob(parsed.did, parsed.cid);
      if (result) {
        objectUrls.push(result.url);
        triggerDownload(result.url, `${parsed.cid}.${mimeToExt(result.type)}`);
        return;
      }
    } catch (e) {
      console.error(e);
    }
    window.open(slide.src, '_blank', 'noopener');
  }

  onDestroy(() => {
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls.length = 0;
  });

  const filmstripBehavior: Attachment<HTMLElement> = (node) => {
    const observer = new ResizeObserver(() => {
      stripOverflowing = node.scrollWidth > node.clientWidth;
    });
    observer.observe(node);

    $effect(() => {
      const active = node.children[index] as HTMLElement | undefined;
      active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });

    return () => observer.disconnect();
  };

  $effect(() => {
    const v = viewer;
    if (!v) return;
    return v.on('ui', (detail: { visible: boolean }) => {
      uiVisible = detail.visible;
      onuichange?.(detail.visible);
    });
  });
</script>

<div class="media-lightbox">
  <div class="media-lightbox__viewer">
    <Lightbox
      inline
      bind:index
      bind:viewer
      {slides}
      backdropOpacity={0}
      zoom={{ max: 2, doubleTap: 2 }}
      dismiss={{ drag: true, pinch: true }}
      keyboard={false}
      onclose={() => onclose?.()}
    >
      {#snippet toolbar(ctx)}
        <ToolbarButton label="Download image" onclick={() => download(ctx.slide)}>
          <Save />
        </ToolbarButton>
        <ToolbarButton label="Close" style="order: 10" onclick={() => onclose?.()}>
          <X />
        </ToolbarButton>
      {/snippet}

      {#snippet caption(ctx)}
        <ImageAlt {images} index={ctx.index} />
      {/snippet}
    </Lightbox>
  </div>

  {#if images.length > 1}
    <div
      class="media-lightbox__filmstrip"
      class:media-lightbox__filmstrip--overflowing={stripOverflowing}
      class:media-lightbox__filmstrip--hidden={!uiVisible}
      {@attach filmstripBehavior}
    >
      {#each images as image, i (image.fullsize)}
        <button
          type="button"
          class="media-lightbox__thumb"
          class:media-lightbox__thumb--active={i === index}
          aria-label="Image {i + 1}"
          aria-current={i === index}
          onclick={() => viewer?.goTo(i)}
        >
          <img src={image.thumb} alt="" loading="lazy" />
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .media-lightbox {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      gap: 8px;
  }

  .media-lightbox__viewer {
      position: relative;
      flex: 1;
      min-height: 0;

      :global(.pcl__arrow) {
          display: none;
      }
  }

  .media-lightbox__filmstrip {
      flex-shrink: 0;
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 6px 24px 14px;
      overflow-x: auto;
      scroll-behavior: smooth;
      scrollbar-width: none;
      transition: opacity .2s ease;

      &::-webkit-scrollbar {
          display: none;
      }

      &--overflowing {
          justify-content: flex-start;
          mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent);
      }

      &--hidden {
          opacity: 0;
          pointer-events: none;
      }

      @media (max-width: 959px) {
          display: none;
      }
  }

  .media-lightbox__thumb {
      flex-shrink: 0;
      width: 56px;
      height: 56px;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
      opacity: .45;
      transform: scale(.92);
      transition: opacity .2s ease, transform .2s ease, outline-color .2s ease;
      outline: 2px solid transparent;
      outline-offset: -2px;

      &--active {
          opacity: 1;
          transform: scale(1);
          outline-color: var(--primary-color);
      }

      &:hover,
      &:focus-visible {
          opacity: 1;
          transform: scale(1);
      }

      img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
      }
  }
</style>
