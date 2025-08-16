<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import {onMount} from "svelte";
  import ThemeItem from "./ThemeItem.svelte";

  let themes = $state([]);

  onMount(async () => {
      const res = await fetch(`/api/get-themes`, {
          method: 'post',
          body: JSON.stringify({
              code: null,
          })
      });
      const data = await res.json();
      themes = data;
  })
</script>

<svelte:head>
  <title>{m.theme_store()} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{m.theme_store()}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="theme-store-wrap">
    {#if themes.length}
      <!--
      <section class="theme-store-slider">
        <Splide options={{
          type: 'loop',
          rewind: true,
          gap: '20px',
          arrows: false,
          pagination: false,
          autoplay: true,
      }}>
          {#each themes as theme}
            <SplideSlide>
              <img src="{theme.options.cover}" alt="">
            </SplideSlide>
          {/each}
        </Splide>
      </section>
      -->
    {/if}

    <p class="theme-store-supporter-recommend">{m.theme_store_supporter_recommend_1()}<a href="https://tokimeki.fanbox.cc/" target="_blank">pixivFANBOX</a>{m.theme_store_supporter_recommend_2()}</p>

    <div class="theme-store-section only-mobile">
      <ul class="p-menu-nav p-menu-nav--2columns">
        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/mytheme">{m.theme_store_my_theme()}</a></p>
        </li>

        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ticket"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/code">{m.theme_store_code()}</a></p>
        </li>
      </ul>
    </div>

    <section class="theme-store-section">
      <h2 class="theme-store-section__title">{m.new_theme()}</h2>

      {#each themes as theme}
        <ThemeItem {theme}></ThemeItem>
      {/each}
    </section>
  </div>
</div>

<style lang="postcss">
  .theme-store-slider {
      margin-bottom: 24px;

      img {
          width: 100%;
          height: auto;
      }
  }

  .theme-store-supporter-recommend {
    margin-bottom: 16px;
  }
</style>