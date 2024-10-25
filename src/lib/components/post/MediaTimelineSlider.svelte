<script lang="ts">
  import emblaCarouselSvelte from 'embla-carousel-svelte';

  let { images } = $props();
</script>

{#if (images.length > 1)}
  <div
    class="embla"
    use:emblaCarouselSvelte={{options: {
      loop: false,
    }}}
  >
    <div class="embla__container">
      {#each images as image}
        <div class="embla__slide">
          <img src="{image.fullsize}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
        </div>
      {/each}
    </div>
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
    }

    .embla__container {
        display: flex;
        gap: 16px;
    }

    .embla__slide {
        flex: 0 0 100%;
        min-width: 0;
    }
</style>