<script lang="ts">
  import { PUBLIC_KLIPY_API_KEY } from '$env/static/public';
  import Infinite from "$lib/components/utils/Infinite.svelte";

  interface Props {
    category: 'search' | 'trending';
    term: string;
    onclick: (gif: { url: string; title: string }) => void;
  }

  let { category, term, onclick }: Props = $props();
  let page = 1;
  let gifs = $state<any[]>([]);

  function basename(url: string): string {
      try {
          const path = new URL(url).pathname;
          const last = path.split('/').pop() ?? '';
          return last.replace(/\.[^.]+$/, '');
      } catch {
          return '';
      }
  }

  function handleClick(item: any) {
      const file = item?.file?.hd ?? item?.file?.md ?? item?.file?.sm ?? item?.file?.xs;
      const gif = file?.gif;
      const mp4 = file?.mp4;
      const webm = file?.webm;
      if (!gif?.url) return;

      const params = new URLSearchParams();
      if (gif.height) params.set('hh', String(gif.height));
      if (gif.width) params.set('ww', String(gif.width));
      if (mp4?.url) params.set('mp4', basename(mp4.url));
      if (webm?.url) params.set('webm', basename(webm.url));

      onclick({
          url: `${gif.url}?${params.toString()}`,
          title: item.title ?? '',
      });
  }

  async function handleLoadMore(loaded: () => void, complete: () => void) {
      try {
          const params = new URLSearchParams();
          params.set('per_page', '24');
          params.set('page', String(page));
          if (term) {
              params.set('q', term);
          }

          const endpoint = `https://api.klipy.com/api/v1/${PUBLIC_KLIPY_API_KEY}/gifs/${category}?${params.toString()}`;
          const res = await fetch(endpoint);
          const json = await res.json();

          const items = json?.data?.data ?? [];
          gifs = [...gifs, ...items];

          if (json?.data?.has_next) {
              page = page + 1;
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

<div class="klipy-grid-wrap">
  <div class="klipy-grid">
    {#each gifs as gif}
      <button class="klipy-grid__item" onclick={() => handleClick(gif)}>
        <img loading="lazy" src={gif?.file?.xs?.gif?.url} alt={gif.title ?? ''}>
      </button>
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
  .klipy-grid-wrap {
      padding-bottom: 16px;
  }

  .klipy-grid {
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
