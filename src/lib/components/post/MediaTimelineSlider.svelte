<script lang="ts">
  import emblaCarouselSvelte from 'embla-carousel-svelte';

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
        </div>
      {/each}
    </div>

    <button class="embla__prev" aria-label="Prev" onclick={handlePrev}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg></button>
    <button class="embla__next" aria-label="Next" onclick={handleNext}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg></button>
  </div>
{:else}
  {#each images as image}
    <img src="{image.fullsize}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
  {/each}
{/if}

<style lang="postcss">
    img {
        width: 100%;
        height: 100%;
        max-height: 80vh;
        object-fit: contain;

        @media (max-width: 959px) {
            height: auto;
        }
    }

    .embla {
        overflow: hidden;
        position: relative;
    }

    .embla__container {
        display: flex;
        gap: 16px;
    }

    .embla__slide {
        flex: 0 0 100%;
        min-width: 0;
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