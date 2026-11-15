<script lang="ts">
  import Radio from '@lucide/svelte/icons/radio';
  import FileArchive from '@lucide/svelte/icons/file-archive';
  import X from '@lucide/svelte/icons/x';
  import { _ } from 'tokimeki-i18n';
  import { agents } from '$lib/stores';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import { explorerRecents } from '$lib/explorer/explorerState.svelte';
  import { explorerPath } from '$lib/explorer/values';

  const accounts = $derived([...$agents.values()].filter((item) => item.did()));
</script>

<svelte:head>
  <title>{$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  <ExplorerBar />

  <div class="explorer-page">
    <div class="explorer-home">
      <h1 class="explorer-home__title">{$_('viewer')}</h1>

      <section>
        <h2 class="explorer-section-title">{$_('explorer_home_accounts')}</h2>
        <ul class="explorer-home__list">
          {#each accounts as account (account.did())}
            <li>
              <a class="explorer-home__item" href={explorerPath({ repo: account.did() })}>
                <span class="explorer-home__label">@{account.handle()}</span>
                <span class="explorer-home__sub">{account.did()}</span>
              </a>
            </li>
          {/each}
        </ul>
      </section>

      {#if explorerRecents.items.length}
        <section>
          <h2 class="explorer-section-title">
            {$_('explorer_home_recent')}
            <button class="explorer-home__clear" onclick={() => explorerRecents.clear()}>{$_('explorer_clear')}</button>
          </h2>
          <ul class="explorer-home__list">
            {#each explorerRecents.items as recent (recent.path)}
              <li class="explorer-home__row">
                <a class="explorer-home__item" href={recent.path}>
                  <span class="explorer-home__label">{recent.label}</span>
                </a>
                <button class="explorer-icon-button" onclick={() => explorerRecents.remove(recent.path)} aria-label={$_('delete')}>
                  <X size="16" />
                </button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}

      <section>
        <h2 class="explorer-section-title">{$_('explorer_home_tools')}</h2>
        <div class="explorer-home__tools">
          <a class="explorer-chip" href="/atproto-viewer/stream"><Radio size="14" />{$_('explorer_view_live')}</a>
          <a class="explorer-chip" href="/atproto-viewer/car"><FileArchive size="14" />{$_('explorer_car_open')}</a>
        </div>
      </section>
    </div>
  </div>
</div>

<style lang="postcss">
  .explorer-home {
      display: grid;
      gap: 28px;
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 20px 48px;

      &__title {
          font-size: 22px;
      }

      &__list {
          list-style: none;
          border-top: 1px solid var(--border-color-2);
      }

      &__row {
          display: flex;
          align-items: center;
          gap: 4px;
          border-bottom: 1px solid var(--border-color-2);

          .explorer-home__item {
              flex: 1;
              border-bottom: none;
          }
      }

      &__item {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 2px 12px;
          min-height: 44px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--border-color-2);
          color: var(--text-color-1);
          min-width: 0;

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__label {
          font-size: 14px;
          overflow-wrap: anywhere;
      }

      &__sub {
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);
          overflow-wrap: anywhere;
      }

      &__clear {
          margin-left: 12px;
          font-size: 11px;
          color: var(--link-color, var(--primary-color));
          letter-spacing: 0;
      }

      &__tools {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
      }
  }
</style>
