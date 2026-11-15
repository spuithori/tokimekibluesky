<script lang="ts">
  import { onDestroy } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { page } from '$app/state';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import { describeServer, listRepos, pdsHealth, type ServerDescription } from '$lib/explorer/pds';
  import { explorerPath } from '$lib/explorer/values';
  import { tidToDate } from '$lib/explorer/tid';
  import { formatDate } from '$lib/dateFormat';

  type Repo = { did: string; rev: string; active?: boolean; status?: string };

  const host = page.params.host ?? '';
  const service = 'https://' + host;
  const controller = new AbortController();
  onDestroy(() => controller.abort());

  let server = $state.raw<ServerDescription>();
  let version = $state<string>();
  let repos = $state.raw<Repo[]>([]);
  let cursor: string | undefined;
  let loading = $state(true);
  let done = $state(false);
  let failed = $state(false);

  async function loadRepos() {
    loading = true;
    try {
      const result = await listRepos(service, { cursor }, controller.signal);
      repos = [...repos, ...result.repos];
      cursor = result.cursor;
      done = !result.cursor || !result.repos.length;
    } catch {
      failed = !controller.signal.aborted;
    }
    loading = false;
  }

  describeServer(service, controller.signal).then((result) => {
    server = result;
  }, () => {});
  pdsHealth(service, controller.signal).then((result) => {
    version = result;
  });
  void loadRepos();
</script>

<svelte:head>
  <title>{host} - {$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  <ExplorerBar crumbs={[{ label: 'PDS' }, { label: host, mono: true }]} query={'pds:' + host} />

  <div class="explorer-page">
    <div class="explorer-pane__padded">
      <h2 class="explorer-pane__title">{host}</h2>

      {#if server || version}
        <dl class="explorer-facts pds-facts">
          {#if server?.did}<div><dt>DID</dt><dd class="explorer-facts__mono">{server.did}</dd></div>{/if}
          {#if version}<div><dt>{$_('explorer_pds_version')}</dt><dd class="explorer-facts__mono">{version}</dd></div>{/if}
          {#if server?.availableUserDomains?.length}<div><dt>{$_('explorer_pds_domains')}</dt><dd class="explorer-facts__mono">{server.availableUserDomains.join(' ')}</dd></div>{/if}
          {#if server?.inviteCodeRequired !== undefined}<div><dt>{$_('explorer_pds_invite')}</dt><dd>{$_(server.inviteCodeRequired ? 'explorer_yes' : 'explorer_no')}</dd></div>{/if}
          {#if server?.contact?.email}<div><dt>{$_('explorer_pds_contact')}</dt><dd>{server.contact.email}</dd></div>{/if}
        </dl>
      {/if}

      <h3 class="explorer-section-title">{$_('explorer_pds_repos')} {repos.length.toLocaleString()}{done ? '' : '+'}</h3>
      <ul class="pds-repos">
        {#each repos as repo (repo.did)}
          {@const date = tidToDate(repo.rev)}
          <li>
            <a class="pds-repos__item" href={explorerPath({ repo: repo.did })}>
              <span class="pds-repos__did">{repo.did}</span>
              {#if repo.active === false}
                <span class="pds-repos__status">{$_('explorer_status_' + (repo.status ?? 'inactive'))}</span>
              {/if}
              {#if date}<time class="pds-repos__time">{formatDate(date, 'yyyy/MM/dd HH:mm')}</time>{/if}
            </a>
          </li>
        {/each}
      </ul>

      {#if loading}
        <LoadingSpinner padding={20} />
      {:else if failed}
        <p class="explorer-empty">{$_('explorer_error_load')}</p>
      {:else if !done}
        <button class="explorer-chip" onclick={loadRepos}>{$_('explorer_load_more')}</button>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .pds-facts {
      margin-bottom: 28px;
  }

  .pds-repos {
      list-style: none;
      margin-bottom: 16px;
      border-top: 1px solid var(--border-color-2);

      &__item {
          display: flex;
          align-items: baseline;
          gap: 12px;
          padding: 9px 4px;
          border-bottom: 1px solid var(--border-color-2);
          font-size: 12px;
          color: var(--text-color-1);
          content-visibility: auto;
          contain-intrinsic-size: auto 38px;

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__did {
          font-family: var(--code-font);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__status {
          color: var(--danger-color);
          white-space: nowrap;
      }

      &__time {
          margin-left: auto;
          color: var(--text-color-3);
          white-space: nowrap;
      }
  }
</style>
