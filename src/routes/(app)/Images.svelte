<script lang="ts">
    import {settings, isDataSaving, isImageOpen} from '$lib/stores';
    import {goto} from "$app/navigation";
    import GifImage from "$lib/components/post/GifImage.svelte";
    import PhotoSwipeLightbox from 'photoswipe/lightbox';
    import {onDestroy} from "svelte";
    import ImageAlt from "$lib/components/utils/ImageAlt.svelte";
    import { mount, unmount } from 'svelte';

    interface Props {
      images: any[];
      blobs?: any[];
      did?: string;
      folding?: boolean;
    }

    let {
      images,
      blobs = [],
      did = '',
      folding = false
    }: Props = $props();

    let galleryImages = [];
    let isFold = $state($settings?.design.postsImageLayout === 'folding' || $isDataSaving || folding);
    let isOpen = false;
    let natural = $state([]);
    let altProps = $state({});

    natural = images.map(() => {
        return {
            width: 0,
            height: 0,
        }
    });

    images.forEach((image, index) => {
        galleryImages.push({
            src: image.fullsize,
            msrc: image.thumb,
            width: image?.aspectRatio?.width,
            height: image?.aspectRatio?.height,
            alt: image.alt ? 'ALT: ' + image.alt : '',
        })
    })

    const lightbox = new PhotoSwipeLightbox({
        dataSource: galleryImages,
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
        galleryImages = galleryImages.map((image, index) => {
            if (!image.width) {
                image.width = natural[index].width || 0;
            }

            if (!image.height) {
                image.height = natural[index].height || 0;
            }

            return image;
        });
        lightbox.loadAndOpen(index);

        isImageOpen.set(true);
        goto('', {noScroll: true});
        isOpen = true;
    }

    lightbox.on('close', () => {
        isImageOpen.set(false);

        if (isOpen) {
            history.back();
        }

        isOpen = false;
    })

    function unfold() {
        isFold = false;
    }

    function handlePopstate() {
      isOpen = false;
      const pswp = lightbox.pswp;
      if (pswp) {
          pswp.close();
      }
    }

    onDestroy(() => {
        lightbox.destroy();
    })
</script>

<svelte:window onpopstate={handlePopstate} />

{#if isFold}
  <button class="image-unfold-button" onclick={unfold}>
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.143" viewBox="0 0 20 17.143">
      <path id="image" d="M49.143,64H34.857A2.86,2.86,0,0,0,32,66.857V78.286a2.86,2.86,0,0,0,2.857,2.857H49.143A2.86,2.86,0,0,0,52,78.286V66.857A2.86,2.86,0,0,0,49.143,64Zm-3.571,2.857A2.143,2.143,0,1,1,43.429,69a2.143,2.143,0,0,1,2.143-2.143ZM34.857,79.714a1.429,1.429,0,0,1-1.429-1.429V75.267L37.662,71.5a2.146,2.146,0,0,1,2.938.085l2.9,2.893-5.233,5.233Zm15.714-1.429a1.429,1.429,0,0,1-1.429,1.429H40.287l5.421-5.421a2.13,2.13,0,0,1,2.752-.007l2.112,1.76Z" transform="translate(-32 -64)" fill="#aeaeae"/>
    </svg>
    <span>×</span>
    <span>{images.length}</span>
  </button>
{:else}
  <div
      class="timeline-images"
      class:timeline-images--compact={$settings?.design.postsImageLayout === 'compact'}
      class:timeline-images--nocrop={$settings?.design.oneImageNoCrop}
  >
    {#each images as image, index}
      <div class="timeline-image">
        {#if (blobs[index]?.image.mimeType === 'image/gif')}
          <GifImage {did} blob={blobs[index]?.image} alt={image.alt}></GifImage>
        {:else}
          <button onclick={() => open(index)} aria-label="画像を拡大する">
            <img
                src="{image.thumb}"
                alt="{image.alt}"
                width={image?.aspectRatio?.width}
                height={image?.aspectRatio?.height}
                bind:naturalWidth={natural[index].width}
                bind:naturalHeight={natural[index].height}
            >
          </button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style lang="postcss">
    .timeline-image {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border-radius: 6px;
        display: flex;

        &:only-child {
            grid-column: span 2;
        }

        button {
            width: 100%;
            height: 100%;
            cursor: zoom-in;
        }
    }

    .image-unfold-button {
        border: 1px solid var(--border-color-1);
        border-radius: 4px;
        padding: 0 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 30px;
        gap: 5px;
        color: var(--text-color-3);
        transition: all .2s ease-in-out;

        path {
            transition: all .2s ease-in-out;
        }
        
        &:hover {
            background-color: var(--bg-color-2);
            color: var(--primary-color);

            path {
                fill: var(--primary-color);
            }
        }
    }
</style>