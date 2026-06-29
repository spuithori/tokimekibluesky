<script lang="ts">
    import X from '@lucide/svelte/icons/x';
    import ZoomIn from '@lucide/svelte/icons/zoom-in';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import Save from '@lucide/svelte/icons/save';
    import BookOpen from '@lucide/svelte/icons/book-open';
  import {imageState} from "$lib/classes/imageState.svelte";
  import {comicReaderState} from "$lib/classes/comicReaderState.svelte";
  import PhotoSwipeLightbox from "photoswipe/lightbox";
  import {mount, onMount, unmount, onDestroy} from "svelte";
  import ImageAlt from "$lib/components/utils/ImageAlt.svelte";
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';
  import { parseCdnUrl, fetchOriginalBlob } from "$lib/util";

  const images = imageState.images;
  let altProps = $state({});

  const objectUrls: string[] = [];
  let currentAbort: AbortController | null = null;

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

  async function loadOriginal(index: number) {
    currentAbort?.abort();
    const abort = new AbortController();
    currentAbort = abort;

    const src = images[index]?.src;
    if (!src) return;

    const parsed = parseCdnUrl(src);
    if (!parsed) return;

    try {
      const result = await fetchOriginalBlob(parsed.did, parsed.cid, abort.signal);
      if (!result || abort.signal.aborted) return;

      objectUrls.push(result.url);
      images[index].src = result.url;
      images[index].downloadName = `${parsed.cid}.${mimeToExt(result.type)}`;

      if (lightbox.pswp?.currIndex === index) {
        const el = lightbox.pswp.currSlide?.content?.element;
        if (el?.tagName === 'IMG') {
          (el as HTMLImageElement).src = result.url;
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError' && !abort.signal.aborted) console.error(e);
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

  const lightbox = new PhotoSwipeLightbox({
    dataSource: images,
    pswpModule: () => import('photoswipe'),
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 2,
    bgOpacity: 0.9,
    closeSVG: '<X size={28} color="#fff" />',
    zoomSVG: '<ZoomIn color="#fff" />',
    arrowNextSVG: '<ChevronRight size={36} color="#fff" />',
    arrowPrevSVG: '<ChevronLeft size={36} color="#fff" />',
    appendToEl: document.querySelector('.app'),
    loop: false,
  });

  lightbox.on('firstUpdate', () => {
    loadOriginal(lightbox.pswp.currIndex);

    lightbox.pswp.on('change', () => {
      loadOriginal(lightbox.pswp.currIndex);
    });
  });

  lightbox.on('uiRegister', () => {
    lightbox.pswp.ui.registerElement({
      name: 'download-button',
      order: 8,
      isButton: true,
      tagName: 'button',
      html: '<Save color="#fff" />',
      onClick: async () => {
        const data = lightbox.pswp.currSlide.data;
        const originalSrc = data.src ?? '';
        let url = originalSrc;
        let filename: string | undefined = data.downloadName;

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
          window.open(originalSrc, '_blank');
        }
      }
    });

    lightbox.pswp.ui.registerElement({
      name: 'comic-reader-button',
      order: 7,
      isButton: true,
      tagName: 'button',
      html: '<BookOpen color="#fff" />',
      onInit: (el) => {
        el.setAttribute('aria-label', 'Open comic reader');
        el.setAttribute('title', 'Open comic reader');
      },
      onClick: () => {
        const pages = imageState.comicReaderImages.length ? imageState.comicReaderImages : imageState.images;
        const localIndex = lightbox.pswp?.currIndex ?? imageState.startIndex;
        const baseOffset = imageState.comicReaderStartIndex - imageState.startIndex;
        const comicReaderIndex = baseOffset + localIndex;
        comicReaderState.open(pages, comicReaderIndex);
        lightbox.pswp.close();
      }
    });

    lightbox.pswp.ui.registerElement({
      name: 'alt-text',
      isButton: false,
      tagName: 'div',
      appendTo: 'root',
      onInit: (el, pswp) => {
        altProps = {
          pswp: pswp,
          images: images,
          index: pswp.currIndex,
        }

        const svelteComponent = mount(ImageAlt, {
          target: el,
          props: altProps,
        });

        pswp.on('change', () => {
          altProps.index = pswp.currIndex;
        })

        return {
          destroy: () => {
            unmount(svelteComponent);
          }
        };
      }
    });
  })
  lightbox.init();

  function open(index: any) {
    lightbox.loadAndOpen(index);
    pushState('', {
      showImage: true,
    });
  }

  lightbox.on('close', () => {
    currentAbort?.abort();
    currentAbort = null;
    for (const url of objectUrls) {
      URL.revokeObjectURL(url);
    }
    objectUrls.length = 0;

    if (page.state.showImage) {
      history.back();
    }
    imageState.close();
  })

  onMount(() => {
    open(imageState.startIndex);
  });

  onDestroy(() => {
    lightbox.destroy();
  });

  function handlePopstate() {
    lightbox.pswp?.close();
  }
</script>

<svelte:window onpopstate={handlePopstate}></svelte:window>
