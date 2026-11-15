<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import IdCard from '@lucide/svelte/icons/id-card';
  import Images from '@lucide/svelte/icons/images';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Radio from '@lucide/svelte/icons/radio';
  import ChartNoAxesColumn from '@lucide/svelte/icons/chart-no-axes-column';
  import Plus from '@lucide/svelte/icons/plus';
  import { _, locale } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { getOwnAgent, getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { settingsStore } from '$lib/settings/settings.svelte';
  import { KNOWN_APPS, collectionAuthority, domainOf, findApp, type CollectionApp } from '$lib/explorer/apps';

  interface Profile {
    displayName?: string;
    avatar?: string;
  }

  let { collection = undefined, view = undefined, profile = undefined, wide = true }: {
    collection?: string;
    view?: string;
    profile?: Profile;
    wide?: boolean;
  } = $props();

  const repo = getRepoContext();
  const ownAgent = getOwnAgent();
  const local = !!repo.source?.local;

  const VIEWS = [
    { id: 'overview', label: 'explorer_view_overview', icon: IdCard },
    { id: 'blobs', label: 'explorer_view_blobs', icon: Images },
    { id: 'backlinks', label: 'explorer_tab_backlinks', icon: Link2 },
    { id: 'live', label: 'explorer_view_live', icon: Radio },
    { id: 'analyze', label: 'explorer_view_analyze', icon: ChartNoAxesColumn },
  ];

  interface Item {
    nsid: string;
    name: string;
    app?: CollectionApp;
  }

  let filter = $state('');

  const visual = $derived(settingsStore.explorer.visual && !local);

  const groups = $derived.by(() => {
    const needle = filter.trim().toLowerCase();
    const map = new Map<string, { app?: CollectionApp; items: Item[] }>();
    for (const nsid of repo.collections) {
      if (needle && !nsid.toLowerCase().includes(needle)) continue;
      const known = visual ? findApp(nsid, KNOWN_APPS) : undefined;
      const prefix = known?.prefix ?? collectionAuthority(nsid);
      const item = { nsid, name: nsid.slice(prefix.length + 1) || nsid, app: known ? undefined : visual ? findApp(nsid, repo.apps)?.app : undefined };
      const group = map.get(prefix);
      if (group) group.items.push(item);
      else map.set(prefix, { app: known?.app, items: [item] });
    }
    return [...map].map(([prefix, group]) => {
      const shared = group.items[0].app && group.items.every((item) => item.app === group.items[0].app) ? group.items[0].app : undefined;
      return { authority: domainOf(prefix), app: group.app ?? shared, items: shared ? group.items.map((item) => ({ ...item, app: undefined })) : group.items };
    });
  });
  const currentView = $derived(collection ? undefined : view ?? (wide ? (local ? 'analyze' : 'overview') : undefined));

  async function copyDid() {
    await navigator.clipboard.writeText(repo.did);
    toast.success($_('explorer_copied'));
  }
</script>

<div class="repo-side">
  <div class="repo-side__identity">
    {#if profile?.avatar}
      <img class="repo-side__avatar" src={profile.avatar.replace('/img/avatar/plain/', '/img/avatar_thumbnail/plain/')} alt="" width="44" height="44" />
    {:else}
      <span class="repo-side__avatar"></span>
    {/if}
    <div class="repo-side__names">
      <p class="repo-side__name">{profile?.displayName || repo.identity.handle || repo.did}</p>
      {#if repo.identity.handle}
        <p class="repo-side__handle">@{repo.identity.handle}</p>
      {/if}
    </div>
  </div>

  <button class="repo-side__did" onclick={copyDid} title={$_('explorer_copy_did')}>
    <span>{repo.did}</span>
    <Copy size="13" />
  </button>

  {#if repo.collectionsState !== 'loading' && repo.collectionsState !== 'ready'}
    <p class="repo-side__alert">{$_('explorer_status_' + repo.collectionsState)}</p>
  {/if}

  <nav class="repo-side__nav" aria-label={$_('viewer')}>
      {#each local ? VIEWS.filter((item) => item.id === 'analyze') : VIEWS as item (item.id)}
        <a class="repo-side__link" class:repo-side__link--active={currentView === item.id} href="{repo.path()}?view={item.id}" aria-current={currentView === item.id ? 'page' : undefined}>
          <item.icon size="16" />
          {$_(item.label)}
        </a>
      {/each}
  </nav>

  <div class="repo-side__section" {@attach visual && repo.collections.length ? () => repo.loadApps($locale) : undefined}>
    <h3 class="repo-side__heading">
      {$_('explorer_collections')}
      <span class="repo-side__total">{repo.collections.length || ''}</span>
      {#if ownAgent() && !local}
        <a class="explorer-icon-button repo-side__new" href="{repo.path()}?new=1" aria-label={$_('explorer_new_record')} title={$_('explorer_new_record')}>
          <Plus size="16" />
        </a>
      {/if}
    </h3>

    {#if repo.collections.length > 8}
      <input class="explorer-filter repo-side__filter" type="search" bind:value={filter} placeholder={$_('explorer_filter_collections')} aria-label={$_('explorer_filter_collections')} />
    {/if}

    {#if repo.collectionsState === 'loading'}
      <LoadingSpinner padding={20} size={20} />
    {:else}
      {#each groups as group (group.authority)}
        {@const app = group.app}
        <div class="repo-side__group">
          {#if app}
            <p class="repo-side__authority repo-side__authority--app">
              {#if app.icon}
                <img class="repo-side__app-icon" src={app.icon} alt="" width="16" height="16" loading="lazy" decoding="async" />
              {/if}
              {#if app.href}
                <a class="repo-side__app-name" href={app.href}>{app.name}</a>
              {:else}
                <span class="repo-side__app-name">{app.name}</span>
              {/if}
              <span class="repo-side__domain">{group.authority}</span>
            </p>
          {:else}
            <p class="repo-side__authority">{group.authority}</p>
          {/if}
          {#each group.items as item (item.nsid)}
            <a class="repo-side__link repo-side__link--collection" class:repo-side__link--active={collection === item.nsid} href={repo.path(item.nsid)} aria-current={collection === item.nsid ? 'page' : undefined} title={item.nsid}>
              <span class="repo-side__collection">{item.name}</span>
              {#if item.app}
                <span class="repo-side__tag">{item.app.name}</span>
              {/if}
              {#if repo.counts}
                <span class="repo-side__count">{(repo.counts.get(item.nsid) ?? 0).toLocaleString()}</span>
              {/if}
            </a>
          {/each}
        </div>
      {:else}
        {#if repo.collectionsState === 'ready'}
          <p class="explorer-empty">{$_('explorer_no_collections')}</p>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style lang="postcss">
  .repo-side {
      padding: 16px 10px 24px;

      &__identity {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 0 6px;
      }

      &__avatar {
          flex: none;
          width: 44px;
          height: 44px;
          border-radius: var(--avatar-border-radius, 50%);
          background-color: var(--bg-color-3);
          object-fit: cover;
      }

      &__names {
          min-width: 0;
      }

      &__name {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__handle {
          font-size: 12px;
          color: var(--text-color-3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__did {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          margin-top: 10px;
          padding: 5px 6px;
          border-radius: var(--border-radius-2);
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);
          text-align: left;

          span {
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }

          :global(svg) {
              flex: none;
          }

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
                  color: var(--text-color-1);
              }
          }
      }

      &__alert {
          margin: 10px 6px 0;
          padding: 8px 10px;
          border-radius: var(--radius-control, 6px);
          font-size: 12px;
          font-weight: 600;
          color: var(--danger-color);
          background-color: color-mix(in oklab, var(--danger-color) 10%, transparent);
      }

      &__nav {
          display: grid;
          gap: 1px;
          margin-top: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color-2);
      }

      &__link {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 34px;
          padding: 4px 10px;
          border-radius: var(--radius-control, 6px);
          font-size: 13px;
          color: var(--text-color-1);

          @media (max-width: 767px) {
              min-height: 42px;
          }

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }

          &--active {
              background-color: var(--state-selected, var(--bg-color-3));
              font-weight: 600;
          }

          &--collection {
              justify-content: space-between;
              padding-left: 18px;
          }
      }

      &__section {
          margin-top: 14px;
      }

      &__heading {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 30px;
          padding: 0 6px 0 10px;
          font-size: 12px;
          color: var(--text-color-3);
          letter-spacing: .04em;
      }

      &__total {
          font-variant-numeric: tabular-nums;
          font-weight: 400;
      }

      &__new {
          margin-left: auto;
      }

      &__filter {
          margin: 4px 6px 8px;
          width: calc(100% - 12px);
      }

      &__group {
          margin-top: 8px;
      }

      &__authority {
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-color-3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__authority--app {
          display: flex;
          align-items: center;
          gap: 6px;
      }

      &__app-icon {
          flex: none;
          width: 16px;
          height: 16px;
          border-radius: 4px;
          object-fit: cover;
      }

      &__app-name {
          flex: none;
          font-size: 12px;
          color: var(--text-color-1);
      }

      &__domain {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 400;
      }

      &__collection {
          font-family: var(--code-font);
          font-size: 12px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__tag {
          flex: none;
          margin-left: auto;
          padding: 0 6px;
          border-radius: var(--radius-round, 999px);
          font-size: 10px;
          line-height: 16px;
          color: var(--text-color-3);
          background-color: var(--bg-color-3);
      }

      &__count {
          flex: none;
          font-size: 11px;
          font-variant-numeric: tabular-nums;
          color: var(--text-color-3);
      }
  }
</style>
