<script lang="ts">
  import {imageState} from "$lib/classes/imageState.svelte";
  import PhotoSwipeLightbox from "photoswipe/lightbox";
  import {mount, onMount, unmount, onDestroy} from "svelte";
  import ImageAlt from "$lib/components/utils/ImageAlt.svelte";
  import { pushState } from '$app/navigation';
  import { page } from '$app/state';

  const images = imageState.images;
  let altProps = $state({});

  const lightbox = new PhotoSwipeLightbox({
    dataSource: images,
    pswpModule: () => import('photoswipe'),
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 2,
    bgOpacity: 0.9,
    closeSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    zoomSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zoom-in"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
    arrowNextSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>',
    arrowPrevSVG: '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>',
    appendToEl: document.querySelector('.app'),
    loop: false,
  });

  lightbox.on('uiRegister', () => {
    lightbox.pswp.ui.registerElement({
      name: 'download-button',
      order: 8,
      isButton: true,
      tagName: 'button',
      html: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
      onClick: (event, el) => {
        const url = lightbox.pswp.currSlide.data.src;
        window.open(url, '_blank');
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
    lightbox.pswp.close();
  }
</script>

<svelte:window onpopstate={handlePopstate}></svelte:window>
