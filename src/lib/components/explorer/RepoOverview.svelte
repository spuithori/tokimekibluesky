<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import JsonNode from './JsonNode.svelte';
  import { getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { verifyHandle } from '$lib/explorer/identity';
  import { fetchPlcLog, type PlcChange } from '$lib/explorer/plc';
  import { parseMultikey } from '$lib/explorer/ecdsa';
  import { pdsPath } from '$lib/explorer/input';
  import { explorerPath } from '$lib/explorer/values';
  import { tidToDate } from '$lib/explorer/tid';
  import { formatDate } from '$lib/dateFormat';

  interface ProfileLabel {
    src: string;
    val: string;
    cts?: string;
  }

  let { labels = [] }: { labels?: ProfileLabel[] } = $props();

  const repo = getRepoContext();
  const identity = repo.identity;
  const handleCheck = verifyHandle(identity, repo.signal);
  const history = identity.did.startsWith('did:plc:') ? fetchPlcLog(identity.did, repo.signal) : undefined;
  const keyType = identity.signingKey ? parseMultikey(identity.signingKey)?.type : undefined;
  const pdsHost = identity.pds ? new URL(identity.pds).host : undefined;

  const revDate = $derived(repo.status?.rev ? tidToDate(repo.status.rev) : null);
  const statusKey = $derived(
    repo.status ? (repo.status.active ? 'active' : repo.status.status ?? 'inactive')
      : repo.collectionsState === 'deactivated' || repo.collectionsState === 'takendown' || repo.collectionsState === 'unreachable' ? repo.collectionsState
      : undefined,
  );

  function describe(change: PlcChange): string {
    switch (change.kind) {
      case 'created': return $_('explorer_plc_created');
      case 'tombstone': return $_('explorer_plc_tombstone');
      case 'handle-added': return $_('explorer_plc_handle_added', { value: change.value });
      case 'handle-removed': return $_('explorer_plc_handle_removed', { value: change.value });
      case 'handle-changed': return $_('explorer_plc_handle_changed', { from: change.from, to: change.to });
      case 'service-added': return $_('explorer_plc_service_added', { name: change.name, value: change.value });
      case 'service-removed': return $_('explorer_plc_service_removed', { name: change.name, value: change.value });
      case 'service-changed': return $_('explorer_plc_service_changed', { name: change.name ?? '', from: change.from, to: change.to });
      case 'key-added': return $_('explorer_plc_key_added', { name: change.name });
      case 'key-removed': return $_('explorer_plc_key_removed', { name: change.name });
      case 'key-changed': return $_('explorer_plc_key_changed', { name: change.name ?? '' });
      case 'rotation-added': return $_('explorer_plc_rotation_added');
      case 'rotation-removed': return $_('explorer_plc_rotation_removed');
    }
  }
</script>

<div class="repo-overview">
  <section>
    <h3 class="explorer-section-title">{$_('explorer_identity')}</h3>
    <dl class="explorer-facts">
      <div><dt>DID</dt><dd class="explorer-facts__mono">{identity.did}</dd></div>
      <div>
        <dt>{$_('explorer_handle')}</dt>
        <dd>
          {#if identity.handle}
            <span class="explorer-facts__mono">{identity.handle}</span>
            {#await handleCheck then check}
              <span class="repo-overview__checks">
                {#if check.status === 'verified'}
                  <span class="repo-overview__badge repo-overview__badge--ok"><Check size="12" />{$_('explorer_handle_verified')}</span>
                {:else if check.status === 'mismatch'}
                  <span class="repo-overview__badge repo-overview__badge--bad"><TriangleAlert size="12" />{$_('explorer_handle_mismatch')}</span>
                {:else}
                  <span class="repo-overview__badge">{$_('explorer_handle_unresolved')}</span>
                {/if}
                <span class="repo-overview__method">DNS {check.dns ? (check.dns === identity.did ? '✓' : '✕') : '–'}</span>
                <span class="repo-overview__method">HTTP {check.http ? (check.http === identity.did ? '✓' : '✕') : '–'}</span>
              </span>
            {/await}
          {:else}
            –
          {/if}
        </dd>
      </div>
      <div>
        <dt>PDS</dt>
        <dd>
          {#if pdsHost}
            <a class="explorer-facts__mono explorer-facts__link" href={pdsPath(pdsHost)}>{pdsHost}</a>
          {:else}
            {$_('explorer_pds_missing')}
          {/if}
        </dd>
      </div>
      {#if statusKey}
        <div>
          <dt>{$_('explorer_account_status')}</dt>
          <dd class:repo-overview__inactive={statusKey !== 'active'}>{$_('explorer_status_' + statusKey)}</dd>
        </div>
      {/if}
      {#if repo.status?.rev}
        <div>
          <dt>Rev</dt>
          <dd><span class="explorer-facts__mono">{repo.status.rev}</span>{#if revDate}<span class="repo-overview__aside">{formatDate(revDate, 'yyyy/MM/dd HH:mm:ss')}</span>{/if}</dd>
        </div>
      {/if}
      {#if identity.signingKey}
        <div><dt>{$_('explorer_signing_key')}</dt><dd><span class="explorer-facts__mono">{identity.signingKey}</span>{#if keyType}<span class="repo-overview__aside">{keyType}</span>{/if}</dd></div>
      {/if}
      {#each identity.doc.service ?? [] as service (service.id)}
        {#if !service.id.endsWith('#atproto_pds')}
          <div><dt>{service.id.replace(/^.*#/, '#')}</dt><dd><span class="explorer-facts__mono">{service.serviceEndpoint}</span><span class="repo-overview__aside">{service.type}</span></dd></div>
        {/if}
      {/each}
    </dl>
  </section>

  {#if labels.length}
    <section>
      <h3 class="explorer-section-title">{$_('explorer_labels')}</h3>
      <ul class="repo-overview__labels">
        {#each labels as label (label.src + label.val)}
          <li>
            <span class="repo-overview__label">{label.val}</span>
            <a class="explorer-facts__mono explorer-facts__link" href={explorerPath({ repo: label.src })}>{label.src}</a>
            {#if label.cts}<time>{formatDate(new Date(label.cts), 'yyyy/MM/dd')}</time>{/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if history}
    <section>
      <h3 class="explorer-section-title">{$_('explorer_plc_title')}</h3>
      {#await history}
        <LoadingSpinner padding={16} size={18} />
      {:then log}
        <ol class="repo-overview__log">
          {#each log.items.toReversed() as item (item.cid)}
            <li class="repo-overview__entry" class:repo-overview__entry--nullified={item.nullified}>
              <time class="repo-overview__when" datetime={item.createdAt}>{formatDate(new Date(item.createdAt), 'yyyy/MM/dd HH:mm')}</time>
              <ul class="repo-overview__changes">
                {#each item.changes as change, index (index)}
                  <li>{describe(change)}</li>
                {:else}
                  <li class="repo-overview__nochange">{$_('explorer_plc_no_change')}</li>
                {/each}
              </ul>
              {#if item.signature === 'valid'}
                <span class="repo-overview__badge repo-overview__badge--ok"><Check size="12" />{$_('explorer_plc_signed')}</span>
              {:else if item.signature === 'invalid'}
                <span class="repo-overview__badge repo-overview__badge--bad"><TriangleAlert size="12" />{$_('explorer_plc_bad_signature')}</span>
              {/if}
              {#if item.nullified}
                <span class="repo-overview__badge">{$_('explorer_plc_nullified')}</span>
              {/if}
            </li>
          {/each}
        </ol>
        {#if log.rotationKeys.length}
          <dl class="explorer-facts">
            <div>
              <dt>{$_('explorer_rotation_keys')}</dt>
              <dd>
                {#each log.rotationKeys as key (key)}
                  <span class="explorer-facts__mono repo-overview__key">{key.replace(/^did:key:/, '')}</span>
                {/each}
              </dd>
            </div>
          </dl>
        {/if}
      {:catch}
        <p class="explorer-empty">{$_('explorer_error_load')}</p>
      {/await}
    </section>
  {/if}

  <section>
    <h3 class="explorer-section-title">{$_('explorer_did_document')}</h3>
    <div class="repo-overview__doc">
      <JsonNode value={identity.doc} />
    </div>
  </section>
</div>

<style lang="postcss">
  .repo-overview {
      display: grid;
      gap: 28px;

      &__checks {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-left: 8px;
          vertical-align: middle;
      }

      &__badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 8px;
          border-radius: var(--radius-round, 999px);
          font-size: 11px;
          white-space: nowrap;
          background-color: var(--bg-color-3);
          color: var(--text-color-3);

          &--ok {
              color: color-mix(in oklab, var(--success-color) 70%, var(--text-color-1));
              background-color: color-mix(in oklab, var(--success-color) 14%, transparent);
          }

          &--bad {
              color: var(--danger-color);
              background-color: color-mix(in oklab, var(--danger-color) 12%, transparent);
          }
      }

      &__method {
          font-size: 11px;
          color: var(--text-color-3);
          font-family: var(--code-font);
      }

      &__aside {
          margin-left: 10px;
          font-size: 12px;
          color: var(--text-color-3);
          white-space: nowrap;
      }

      &__inactive {
          color: var(--danger-color);
          font-weight: 600;
      }

      &__key {
          display: block;
      }

      &__labels {
          list-style: none;
          display: grid;
          gap: 6px;
          font-size: 12px;

          li {
              display: flex;
              flex-wrap: wrap;
              align-items: baseline;
              gap: 4px 10px;
              color: var(--text-color-3);
          }
      }

      &__label {
          font-family: var(--code-font);
          padding: 1px 8px;
          border-radius: var(--radius-round, 999px);
          background-color: var(--bg-color-3);
          color: var(--text-color-1);
      }

      &__log {
          list-style: none;
          margin-bottom: 16px;
      }

      &__entry {
          display: grid;
          grid-template-columns: 128px minmax(0, 1fr) auto;
          align-items: start;
          gap: 4px 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border-color-2);
          font-size: 13px;

          &--nullified {
              opacity: .55;
              text-decoration: line-through;
          }

          @container (max-width: 520px) {
              grid-template-columns: minmax(0, 1fr) auto;
          }
      }

      &__when {
          font-size: 12px;
          color: var(--text-color-3);
          white-space: nowrap;
          line-height: 1.7;

          @container (max-width: 520px) {
              grid-column: 1 / -1;
          }
      }

      &__changes {
          list-style: none;
          display: grid;
          gap: 2px;
          line-height: 1.6;
          overflow-wrap: anywhere;
      }

      &__nochange {
          color: var(--text-color-3);
      }

      &__doc {
          padding-left: 20px;
      }
  }
</style>
