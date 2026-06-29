<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import Folder from '@lucide/svelte/icons/folder';
    import Ticket from '@lucide/svelte/icons/ticket';
  import {_} from "svelte-i18n";
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
  <title>{$_('theme_store')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h1 class="column-heading__title">{$_('theme_store')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
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

    <p class="theme-store-supporter-recommend">{$_('theme_store_supporter_recommend_1')}<a href="https://tokimeki.fanbox.cc/" target="_blank">pixivFANBOX</a>{$_('theme_store_supporter_recommend_2')}</p>

    <div class="theme-store-section only-mobile">
      <ul class="p-menu-nav p-menu-nav--2columns">
        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <Folder color="var(--text-color-1)" />
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/mytheme">{$_('theme_store_my_theme')}</a></p>
        </li>

        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <Ticket color="var(--text-color-1)" />
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/code">{$_('theme_store_code')}</a></p>
        </li>
      </ul>
    </div>

    <section class="theme-store-section">
      <h2 class="theme-store-section__title">{$_('new_theme')}</h2>

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