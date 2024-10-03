<script lang="ts">
  import {Splide, SplideSlide} from "@splidejs/svelte-splide";

  export let images;
</script>

{#if (images.length > 1)}
  <Splide options={ {
    gap: '20px',
  } }>
    {#each images as image}
      <SplideSlide>
        <img src="{image.fullsize}" alt="{image.alt}" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
      </SplideSlide>
    {/each}
  </Splide>
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
</style>