<script lang="ts">
  import {themesDb} from "$lib/db";
  import {liveQuery} from "dexie";
  import {settings} from "$lib/stores";
  import { m } from "$lib/paraglide/messages.js";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { toast } from "svelte-sonner";

  interface Props {
    theme: any;
    isBuiltIn?: boolean;
  }

  let { theme, isBuiltIn = false }: Props = $props();

  let isMenuOpen = $state(false);

  let myTheme = $derived(liveQuery(async () => {
      const myTheme = await themesDb.themes.get(theme.id);
      return myTheme;
  }))

  async function download() {
      const id = await themesDb.themes.put($state.snapshot({
          id: theme.id,
          createdAt: theme.created_at,
          updatedAt: theme.updated_at,
          name: theme.name,
          description: theme.description,
          style: theme.style,
          options: theme.options,
          author: theme.author,
          keyword: theme.keyword,
          version: theme.version,
          code: theme.code,
      }))
  }

  function activate() {
      $settings.design.skin = theme.id;
  }

  async function uninstall() {
      try {
          const id = await themesDb.themes.delete(theme.id);

          toast.success(m.theme_uninstall_success());
      } catch (e) {
          console.error(e);
      }

      isMenuOpen = false;
  }
</script>

<section class="theme-item">
  <div class="theme-item__thumbnail">
    {#if (theme.options?.thumbnail)}
      <img src="{theme.options.thumbnail}" alt="">
    {/if}
  </div>

  <div class="theme-item__content">
    <h2 class="theme-item__title">{theme.name}</h2>
    <p class="theme-item__text">{theme.description}</p>

    <dl class="theme-item-meta">
      <div class="theme-item-meta__item">
        <dl class="theme-item-meta__name">{m.theme_author()}:</dl>
        <dd class="theme-item-meta__content">{theme.author}</dd>
      </div>

      <div class="theme-item-meta__item">
        <dl class="theme-item-meta__name">{m.theme_version()}:</dl>
        <dd class="theme-item-meta__content">{theme.version}</dd>
      </div>

      {#if theme.options.colors}
        <div class="theme-item-meta__item">
          <dl class="theme-item-meta__name">{m.theme_feature()}:</dl>
          <dd class="theme-item-meta__content">{m.theme_custom_color()}</dd>
        </div>
      {/if}

      {#if theme?.keyword === 'bubble'}
        <p class="theme-item-meta__bubble">{m.theme_for_bubble()}</p>
      {/if}
    </dl>

    <div class="theme-item__buttons">
      {#if (!isBuiltIn)}
        {#if (!$myTheme)}
          <button class="button button--ss" onclick={download}>{m.theme_install()}</button>
        {:else}
          <button class="text-button" onclick={download}>
            {#if ($myTheme ? $myTheme.version === theme.version : true)}
              {m.theme_reinstall()}
            {:else}
              {m.theme_update()}
            {/if}
          </button>
        {/if}
      {/if}

      {#if $settings.design?.skin === theme.id}
        <button class="button button--ss" disabled>{m.theme_current()}</button>
      {:else}
        {#if ($myTheme || isBuiltIn)}
          <button class="button button--ss" onclick={activate}>{m.theme_activate()}</button>
        {/if}
      {/if}
    </div>
  </div>

  {#if (!isBuiltIn)}
    <Menu bind:isMenuOpen={isMenuOpen}>
      {#snippet content()}
            <ul class="timeline-menu-list" >
          {#if $settings.design?.skin !== theme.id && $myTheme}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={uninstall}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                <span>{m.theme_uninstall()}</span>
              </button>
            </li>
          {/if}
        </ul>
          {/snippet}
    </Menu>
  {/if}
</section>

<style lang="postcss">
  .theme-item {
      padding: 16px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      margin-bottom: 16px;
      border-radius: var(--border-radius-3);
      display: grid;
      align-items: flex-start;
      grid-template-columns: 60px 1fr;
      gap: 8px;
      position: relative;

      img {
          width: 100%;
          height: auto;
      }

      &__thumbnail {
          border-radius: var(--border-radius-3);
          overflow: hidden;
      }

      &__title {
          color: var(--text-color-1);
          font-size: 16px;
          margin-bottom: 4px;
      }

      &__text {
          color: var(--text-color-3);
          font-size: 14px;
      }

      &__buttons {
          display: flex;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
      }
  }

  .theme-item-meta {
      color: var(--text-color-3);
      font-size: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;

      &__item {
          display: flex;
          gap: 4px;
      }

      &__bubble {
          background-color: var(--primary-color);
          color: var(--bg-color-1);
          padding: 4px 8px;
          border-radius: var(--border-radius-3);
          font-size: 13px;
      }
  }
</style>