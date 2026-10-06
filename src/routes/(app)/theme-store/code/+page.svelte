<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import {_} from "tokimeki-i18n";
    import ThemeItem from "../ThemeItem.svelte";
    import { listApprovedThemes, sha256Hex, type ApprovedTheme } from "$lib/theme/atproto";

    let value = $state('');
    let themes: ApprovedTheme[] = $state([]);

    async function getThemes(event: SubmitEvent) {
        event.preventDefault();
        const hash = await sha256Hex(value.trim());
        const list = await listApprovedThemes();
        themes = list.filter((item) => item.access === 'code' && item.codeHash === hash);
    }
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

    <h1 class="column-heading__title">{$_('theme_store_code')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
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

        {#each themes as item (item.approvalUri)}
          <ThemeItem remote={item.theme}></ThemeItem>
        {/each}
      </section>
    {/if}
  </div>
</div>