<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import Globe from '@lucide/svelte/icons/globe';
  import Plus from '@lucide/svelte/icons/plus';
  import { SvelteSet } from 'svelte/reactivity';
  import Sortable from '$lib/components/utils/Sortable.svelte';
  import { MAX_PROFILE_LINKS, formatLinkUrl, getLinkHost, linkIconSrc, type ProfileLink } from '$lib/profileLinks/rules';

  interface Props {
    links: ProfileLink[];
    did: string;
    status: 'loading' | 'ready' | 'error';
    onedit: (index: number | null) => void;
  }

  let { links = $bindable(), did, status, onedit }: Props = $props();

  const failedIcons = new SvelteSet<string>();
</script>

<dl class="input-group">
  <dt class="input-group__name input-group__name--show">{$_('profile_links')}</dt>

  <dd class="input-group__content">
    {#if status === 'error'}
      <p class="links-editor__message">{$_('profile_links_load_failed')}</p>
    {:else if status === 'ready'}
      {#if links.length}
        <Sortable items={links} onsort={(ordered: ProfileLink[]) => { links = ordered; }}>
          {#snippet content(link: ProfileLink, index: number)}
            {@const iconSrc = linkIconSrc(link, did)}
            <button type="button" class="links-editor__item" onclick={() => onedit(index)}>
              {#if iconSrc && !failedIcons.has(iconSrc)}
                <img class="links-editor__icon" src={iconSrc} alt="" width="16" height="16" onerror={() => failedIcons.add(iconSrc)}>
              {:else}
                <Globe size="16" color="var(--text-color-3)"></Globe>
              {/if}
              <span class="links-editor__text">
                <span class="links-editor__title">{link.title || getLinkHost(link.url)}</span>
                <span class="links-editor__url">{formatLinkUrl(link.url)}</span>
              </span>
            </button>
          {/snippet}
        </Sortable>
      {/if}

      {#if links.length < MAX_PROFILE_LINKS}
        <button type="button" class="links-editor__add" onclick={() => onedit(null)}>
          <Plus size="16"></Plus>
          {$_('profile_link_add')}
        </button>
      {/if}
    {/if}
  </dd>
</dl>

<style lang="postcss">
  .links-editor {
      &__item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px 8px 28px;
          border: 1px solid var(--border-color-1);
          border-radius: var(--radius-control, 6px);
          background-color: var(--bg-color-1);
          color: var(--text-color-1);
          text-align: left;
      }

      &__icon {
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          border-radius: 3px;
          object-fit: contain;
      }

      &__text {
          display: grid;
          min-width: 0;
      }

      &__title,
      &__url {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__title {
          font-size: 14px;
          font-weight: bold;
      }

      &__url {
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__add {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 100%;
          margin-top: 8px;
          padding: 8px 12px;
          border: 1px dashed var(--border-color-1);
          border-radius: var(--radius-control, 6px);
          color: var(--text-color-1);
          font-size: 14px;
      }

      &__message {
          font-size: 14px;
          color: var(--text-color-3);
      }
  }
</style>
