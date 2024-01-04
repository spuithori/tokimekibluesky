<script lang="ts">
    // @ts-ignore
    import GLightbox from 'glightbox';
    import {settings, isDataSaving, isImageOpen, agent} from '$lib/stores';
    import {goto} from "$app/navigation";
    import GifImage from "$lib/components/post/GifImage.svelte";
    export let images: any[];
    export let blobs: any[] = [];
    export let _agent = $agent;
    export let did = '';
    export let folding = false;

    let galleryImages = [];
    let isFold = $settings?.design.postsImageLayout === 'folding' || $isDataSaving || folding;
    let isOpen = false;

    for (const image of images) {
        galleryImages.push({
            'href': image.fullsize,
            'type': 'image',
            'description': image.alt ? 'ALT: ' + image.alt : '',
        })
    }

    const gl = GLightbox({
        elements: galleryImages
    })

    function open(index: any) {
        gl.openAt(index);
        isImageOpen.set(true);
        goto('', {noScroll: true});
        isOpen = true;
    }

    gl.on('close', () => {
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
      gl.close();
    }
</script>

<svelte:window on:popstate={handlePopstate} />

{#if isFold}
  <button class="image-unfold-button" on:click={unfold}>
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
              <GifImage {did} {_agent} blob={blobs[index]?.image} alt={image.alt}></GifImage>
          {:else}
              <button on:click={() => open(index)} aria-label="画像を拡大する">
                  <img loading="lazy" src="{image.thumb}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
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
        }

        &:hover img {
            transform: scale(1.1);

            @media (max-width: 959px) {
                transform: scale(1);
            }
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