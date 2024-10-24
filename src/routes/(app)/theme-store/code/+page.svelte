<script lang="ts">
    import {_} from "svelte-i18n";
    import {onMount} from "svelte";
    import ThemeItem from "../ThemeItem.svelte";

    let value = $state('');
    let themes = $state([]);

    async function getThemes() {
        const res = await fetch(`/api/get-themes`, {
            method: 'post',
            body: JSON.stringify({
                code: value,
            })
        });
        const data = await res.json();
        themes = data;
    }
</script>

<svelte:head>
  <title>{$_('theme_store')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('theme_store_code')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <section class="theme-store-section">
      <form onsubmit={getThemes} class="input-with-button">
        <input class="input-with-button__input" type="text" bind:value={value} placeholder="{$_('theme_code_input_placeholder')}">
        <button class="input-with-button__button button button--sm">{$_('theme_code_execute')}</button>
      </form>
    </section>

    <p class="settings-description">{$_('theme_code_description')}</p>

    {#if themes.length}
      <section class="theme-store-section">
        <h2 class="theme-store-section__title">{$_('find_theme')}</h2>

        {#each themes as theme}
          <ThemeItem {theme}></ThemeItem>
        {/each}
      </section>
    {/if}
  </div>
</div>