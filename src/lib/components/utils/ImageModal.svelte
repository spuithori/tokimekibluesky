<script lang="ts">
  import Save from '@lucide/svelte/icons/save';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import { Lightbox, ToolbarButton, type Slide, type Viewer } from 'picola/svelte';
  import 'picola/picola.css';
  import { untrack } from 'svelte';
  import ImageAlt from '$lib/components/utils/ImageAlt.svelte';
  import { imageState } from '$lib/classes/imageState.svelte';
  import { comicReaderState } from '$lib/classes/comicReaderState.svelte';
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { parseCdnUrl, fetchOriginalBlob } from '$lib/util';

  type Meta = { downloadName?: string };

  const objectUrls: string[] = [];
  let currentAbort: AbortController | null = null;

  let open = $state(false);
  let index = $state(0);
  let viewer = $state<Viewer<Meta> | null>(null);
  let lastOpenedImages: unknown = null;

  const slides = $derived(
    imageState.images.map(
      (image): Slide<Meta> => ({
        src: image.src,
        placeholder: image.msrc,
        width: image.width,
        height: image.height,
        alt: image.alt,
        meta: { downloadName: image.downloadName }
      })
    )
  );

  $effect(() => {
    const images = imageState.images;
    if (images.length && images !== lastOpenedImages) {
      lastOpenedImages = images;
      untrack(() => {
        index = imageState.startIndex;
        open = true;
      });
    }
  });

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

  async function loadOriginal(i: number) {
    currentAbort?.abort();
    const abort = new AbortController();
    currentAbort = abort;

    const src = (viewer?.slideAt(i) ?? slides[i])?.src;
    if (!src) return;

    const parsed = parseCdnUrl(src);
    if (!parsed) return;

    try {
      const result = await fetchOriginalBlob(parsed.did, parsed.cid, abort.signal);
      if (!result || abort.signal.aborted) return;

      objectUrls.push(result.url);
      viewer?.updateSlide(i, {
        src: result.url,
        meta: { downloadName: `${parsed.cid}.${mimeToExt(result.type)}` }
      });
    } catch (e: any) {
      if (e?.name !== 'AbortError' && !abort.signal.aborted) console.error(e);
    }
  }

  async function download(slide: Slide<Meta> | undefined) {
    if (!slide) return;
    const originalSrc = slide.src;
    let url = originalSrc;
    let filename = slide.meta?.downloadName;

    if (!filename || !url.startsWith('blob:')) {
      const parsed = parseCdnUrl(originalSrc);
      if (parsed) {
        const result = await fetchOriginalBlob(parsed.did, parsed.cid);
        if (result) {
          objectUrls.push(result.url);
          url = result.url;
          filename = `${parsed.cid}.${mimeToExt(result.type)}`;
        }
      }
    }

    if (filename && url.startsWith('blob:')) {
      triggerDownload(url, filename);
    } else {
      window.open(originalSrc, '_blank', 'noopener');
    }
  }

  function openComicReader(currentIndex: number) {
    const pages = imageState.comicReaderImages.length ? imageState.comicReaderImages : imageState.images;
    const baseOffset = imageState.comicReaderStartIndex - imageState.startIndex;
    comicReaderState.open(pages, baseOffset + currentIndex);
    viewer?.close();
  }

  function handleOpen(detail: { index: number }) {
    loadOriginal(detail.index);
    pushState('', { showImage: true });
  }

  function handleClose() {
    currentAbort?.abort();
    currentAbort = null;
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls.length = 0;

    if ((page.state as { showImage?: boolean }).showImage) {
      history.back();
    }
  }

  function handleClosed() {
    imageState.close();
  }

  $effect(() => {
    const shown = (page.state as { showImage?: boolean }).showImage;
    if (!shown) untrack(() => viewer?.close());
  });
</script>

<Lightbox
  bind:open
  bind:index
  bind:viewer
  {slides}
  backdropOpacity={0.9}
  zoom={{ max: 2, doubleTap: 2 }}
  onopen={handleOpen}
  onchange={(detail) => loadOriginal(detail.index)}
  onclose={handleClose}
  onclosed={handleClosed}
>
  {#snippet toolbar(ctx)}
    <ToolbarButton label="Open comic reader" onclick={() => openComicReader(ctx.index)}>
      <BookOpen />
    </ToolbarButton>
    <ToolbarButton label="Download image" onclick={() => download(ctx.slide)}>
      <Save />
    </ToolbarButton>
  {/snippet}

  {#snippet caption(ctx)}
    <ImageAlt images={imageState.images} index={ctx.index} />
  {/snippet}
</Lightbox>
