<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "tokimeki-i18n";
    import {liveQuery} from "dexie";
    import {themesDb} from "$lib/db";
    import ThemeItem from "../ThemeItem.svelte";
    import { BUILTIN_THEMES } from "$lib/theme/installed";

    const myThemes = liveQuery(async () => await themesDb.themes.toArray());
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

    <h1 class="column-heading__title">{$_('theme_store_my_theme')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <section class="theme-store-section">
      <h2 class="theme-store-section__title">{$_('installed_theme')}</h2>

      {#if ($myThemes)}
        {#each $myThemes as theme (theme.id)}
          <ThemeItem installed={theme}></ThemeItem>
        {/each}
      {/if}
    </section>

    <section class="theme-store-section">
      <h2 class="theme-store-section__title">{$_('builtin_theme')}</h2>

      {#each BUILTIN_THEMES as theme (theme.id)}
        <ThemeItem installed={theme}></ThemeItem>
      {/each}
    </section>
  </div>
</div>