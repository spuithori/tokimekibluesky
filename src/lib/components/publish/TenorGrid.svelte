<script lang="ts">
  import { PUBLIC_TENOR_API_KEY } from '$env/static/public';
  import Infinite from "$lib/components/utils/Infinite.svelte";

  interface Props {
    category: 'search' | 'featured';
    term: string;
  }

  let { category, term, onclick }: Props = $props();
  let cursor = '';
  let gifs = $state([]);

  function handleClick(gif) {
      const width = gif.media_formats.gif.dims[0];
      const height = gif.media_formats.gif.dims[1];

      onclick({
        url: `${gif.media_formats.gif.url}?hh=${height}&ww=${width}`,
        title: gif.content_description
      });
  }

  async function handleLoadMore(loaded, complete) {
      try {
          let query = '';

          if (cursor) {
              query = query + `&pos=${cursor}`;
          }

          if (term) {
              query = query + `&q=${term}`;
          }

          const res = await fetch(`https://tenor.googleapis.com/v2/${category}?key=${PUBLIC_TENOR_API_KEY}${query}`);
          const json = await res.json();

          cursor = json.next;
          gifs = [...gifs, ...json.results];

          if (cursor) {
              loaded();
          } else {
              complete();
          }
      } catch (e) {
          console.error(e);
          complete();
      }
  }
</script>

<div class="tenor-grid-wrap">
  <div class="tenor-grid">
    {#each gifs as gif}
      <button class="tenor-grid__item" onclick={() => handleClick(gif)}>
        <img src="{gif.media_formats.tinygif.url}" alt="">
      </button>
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
  .tenor-grid-wrap {
      padding-bottom: 16px;
  }

  .tenor-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4px;

      &__item {
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: var(--bg-color-1);
          border-radius: var(--border-radius-2);
          overflow: hidden;

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
      }
  }
</style>