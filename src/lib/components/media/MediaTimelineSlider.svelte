<script lang="ts">
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import ImageAlt from "$lib/components/utils/ImageAlt.svelte";

  let { images } = $props();
  let emblaApi;

  function onInit(event) {
      emblaApi = event.detail;
  }

  function handleNext() {
      emblaApi.scrollNext();
  }

  function handlePrev() {
      emblaApi.scrollPrev();
  }
</script>

{#if (images.length > 1)}
  <div
    class="embla"
    use:emblaCarouselSvelte={{options: {
      loop: true,
    }}}
    onemblaInit={onInit}
  >
    <div class="embla__container">
      {#each images as image}
        <div class="embla__slide">
          <img src="{image.fullsize}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
          {#if image.alt}
            <div class="image-labels">
              <ImageAlt alt={image.alt} badge />
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <button class="embla__prev" aria-label="Prev" onclick={handlePrev}><ChevronLeft /></button>
    <button class="embla__next" aria-label="Next" onclick={handleNext}><ChevronRight /></button>
  </div>
{:else}
  {#each images as image}
    <div class="single-image">
      <img src="{image.fullsize}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
      {#if image.alt}
        <div class="image-labels">
          <span class="alt-badge" title={image.alt}>ALT</span>
        </div>
      {/if}
    </div>
  {/each}
{/if}

<style lang="postcss">
    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: center;

        @media (max-width: 959px) {
            height: auto;
        }
    }

    .embla {
        overflow: hidden;
        position: relative;
        height: 100%;
    }

    .embla__container {
        display: flex;
        gap: 16px;
        height: 100%;
    }

    .embla__slide {
        position: relative;
        flex: 0 0 100%;
        min-width: 0;

        @media (max-width: 959px) {
            display: grid;
            place-content: center;
        }
    }

    .single-image {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .embla__prev {
        position: absolute;
        left: 16px;
        top: 0;
        bottom: 0;
        margin: auto;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, .5);
        display: grid;
        place-content: center;
    }

    .embla__next {
        position: absolute;
        right: 16px;
        top: 0;
        bottom: 0;
        margin: auto;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, .5);
        display: grid;
        place-content: center;
    }
</style>