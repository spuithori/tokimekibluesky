<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "svelte-i18n";
    import {onMount} from "svelte";
    import {liveQuery} from "dexie";
    import {themesDb} from "$lib/db";
    import ThemeItem from "../ThemeItem.svelte";
    import {builtInThemes} from "$lib/builtInThemes";

    let myThemes = $derived(liveQuery(async () => {
        const myThemes = await themesDb.themes.toArray();
        return myThemes;
    }))
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
        {#each $myThemes as theme}
          <ThemeItem {theme}></ThemeItem>
        {/each}
      {/if}
    </section>

    <section class="theme-store-section">
      <h2 class="theme-store-section__title">{$_('builtin_theme')}</h2>

      {#each builtInThemes as theme}
        <ThemeItem {theme} isBuiltIn={true}></ThemeItem>
      {/each}
    </section>
  </div>
</div>