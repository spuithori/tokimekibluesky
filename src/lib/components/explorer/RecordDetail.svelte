<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import Braces from '@lucide/svelte/icons/braces';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import ShieldAlert from '@lucide/svelte/icons/shield-alert';
  import ShieldQuestion from '@lucide/svelte/icons/shield-question';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import JsonNode from './JsonNode.svelte';
  import Backlinks from './Backlinks.svelte';
  import LexiconView from './LexiconView.svelte';
  import RecordPreview from './RecordPreview.svelte';
  import { describeRecord, previewTarget } from '$lib/explorer/preview';
  import { settingsStore } from '$lib/settings/settings.svelte';
  import { getOwnAgent, getRepoContext, type DetailTab } from '$lib/explorer/explorerState.svelte';
  import { getRecordProof, xrpcUrl, type RepoRecord } from '$lib/explorer/pds';
  import { verifyRecordProof, type RecordProof } from '$lib/explorer/verify';
  import { validateRecord, type Lexicons, type ValidationIssue } from '$lib/explorer/lexicon';
  import { tidToDate } from '$lib/explorer/tid';
  import { formatBytes } from '$lib/explorer/values';
  import { formatDate } from '$lib/dateFormat';

  let { collection, rkey, initial = undefined, onedit = undefined, ondeleted = undefined }: {
    collection: string;
    rkey: string;
    initial?: RepoRecord;
    onedit?: (record: RepoRecord) => void;
    ondeleted?: (record: RepoRecord) => void;
  } = $props();

  const repo = getRepoContext();
  const ownAgent = getOwnAgent();
  const controller = new AbortController();
  const target = untrack(() => ({ collection, rkey, uri: `at://${repo.did}/${collection}/${rkey}` }));
  const date = tidToDate(target.rkey);

  const seed = untrack(() => initial);

  let record = $state.raw(seed);
  let status = $state<'loading' | 'ready' | 'missing'>(seed ? 'ready' : 'loading');
  let proof = $state.raw<RecordProof>();
  let proofStatus = $state<'pending' | 'done' | 'failed'>('pending');
  let lexicons = $state.raw<Lexicons>();
  let confirming = $state(false);
  let deleting = $state(false);

  const TABS: Array<{ id: DetailTab; label: string }> = [
    { id: 'view', label: 'explorer_tab_view' },
    { id: 'record', label: 'explorer_tab_record' },
    { id: 'backlinks', label: 'explorer_tab_backlinks' },
    { id: 'info', label: 'explorer_tab_info' },
    { id: 'schema', label: 'explorer_tab_schema' },
  ];

  const local = !!repo.source?.local;
  const hasVisual = $derived(
    settingsStore.explorer.visual && !local && !!repo.xrpc && !!record
      && (!!previewTarget(target.uri, target.collection, record.value) || !!describeRecord(record.value)),
  );
  const tabs = $derived(TABS.filter((item) => (item.id === 'view' ? hasVisual : item.id === 'backlinks' ? !local : true)));
  const tab = $derived(tabs.some((item) => item.id === repo.detailTab) ? repo.detailTab : 'record');
  const issues = $derived(record && lexicons ? validateRecord(record.value, target.collection, lexicons) : undefined);
  const issueMap = $derived.by(() => {
    if (!issues?.length) return undefined;
    const map = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      const list = map.get(issue.path);
      if (list) list.push(issue);
      else map.set(issue.path, [issue]);
    }
    return map;
  });
  const verdict = $derived.by<'verified' | 'mismatch' | 'unverifiable' | 'pending'>(() => {
    if (proofStatus === 'pending') return 'pending';
    if (proofStatus === 'failed' || !proof) return 'unverifiable';
    if (proof.signature === 'invalid' || !proof.blocksIntact || !proof.didMatches || (record && proof.recordCid !== record.cid)) return 'mismatch';
    return proof.signature === 'valid' ? 'verified' : 'unverifiable';
  });
  const size = $derived(record ? new TextEncoder().encode(JSON.stringify(record.value)).length : 0);
  const canWrite = $derived(!!ownAgent() && !repo.source?.local);
  const blobUrl = (cid: string) => repo.blobUrl(cid);

  onDestroy(() => controller.abort());

  async function load() {
    if (!record && repo.source) {
      try {
        record = await repo.source.get(target.collection, target.rkey, controller.signal);
        status = 'ready';
      } catch {
        if (controller.signal.aborted) return;
        status = 'missing';
      }
    }
    repo.lexicons(target.collection).then((result) => {
      lexicons = result;
    });
    if (!repo.pds || repo.source?.local) {
      proofStatus = 'failed';
      return;
    }
    try {
      const car = await getRecordProof(repo.pds, { did: repo.did, collection: target.collection, rkey: target.rkey }, controller.signal);
      proof = await verifyRecordProof(car, { did: repo.did, collection: target.collection, rkey: target.rkey, signingKey: repo.identity.signingKey });
      proofStatus = 'done';
    } catch {
      proofStatus = 'failed';
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success($_('explorer_copied'));
  }

  async function remove() {
    const agent = ownAgent();
    if (!agent || !record) return;
    deleting = true;
    try {
      await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo: repo.did, collection: target.collection, rkey: target.rkey, swapRecord: record.cid });
      toast.success($_('explorer_deleted'));
      ondeleted?.(record);
    } catch (e) {
      toast.error((e as Error)?.message || $_('explorer_error_write'));
      deleting = false;
      confirming = false;
    }
  }

  void load();
</script>

<article class="record-detail">
  <header class="record-detail__head">
    <div class="record-detail__title">
      <a class="record-detail__collection" href={repo.path(collection)}>{collection}</a>
      <h2 class="record-detail__rkey">{rkey}</h2>
      {#if date}
        <time class="record-detail__time" datetime={date.toISOString()}>{formatDate(date, 'yyyy/MM/dd HH:mm:ss')}</time>
      {/if}
    </div>

    <div class="record-detail__actions">
      {#if verdict === 'verified'}
        <button class="record-detail__verdict record-detail__verdict--ok" onclick={() => { repo.detailTab = 'info'; }}><ShieldCheck size="16" />{$_('explorer_verified')}</button>
      {:else if verdict === 'mismatch'}
        <button class="record-detail__verdict record-detail__verdict--bad" onclick={() => { repo.detailTab = 'info'; }}><ShieldAlert size="16" />{$_('explorer_verify_mismatch')}</button>
      {/if}
      <button class="explorer-icon-button" onclick={() => copy(target.uri)} aria-label={$_('explorer_copy_uri')} title={$_('explorer_copy_uri')}>
        <Copy size="18" />
      </button>
      {#if record}
        <button class="explorer-icon-button" onclick={() => copy(JSON.stringify(record?.value, null, 2))} aria-label={$_('explorer_copy_json')} title={$_('explorer_copy_json')}>
          <Braces size="18" />
        </button>
      {/if}
      {#if canWrite && record}
        <button class="explorer-icon-button" onclick={() => onedit?.(record!)} aria-label={$_('explorer_edit')} title={$_('explorer_edit')}>
          <Pencil size="18" />
        </button>
        <button class="explorer-icon-button explorer-icon-button--danger" onclick={() => { confirming = true; }} aria-label={$_('delete')} title={$_('delete')}>
          <Trash2 size="18" />
        </button>
      {/if}
    </div>
  </header>

  {#if confirming}
    <div class="record-detail__confirm" role="alertdialog" aria-label={$_('explorer_delete_confirm')}>
      <p>{$_('explorer_delete_confirm')}</p>
      <button class="button button--sm button--border" onclick={() => { confirming = false; }} disabled={deleting}>{$_('cancel')}</button>
      <button class="button button--sm button--danger" onclick={remove} disabled={deleting}>{$_('delete')}</button>
    </div>
  {/if}

  <div class="explorer-tabs" role="tablist">
    {#each tabs as item (item.id)}
      <button class="explorer-tabs__tab" class:explorer-tabs__tab--active={tab === item.id} role="tab" aria-selected={tab === item.id} onclick={() => { repo.detailTab = item.id; }}>
        {$_(item.label)}
        {#if item.id === 'record' && issues?.length}
          <span class="explorer-tabs__badge">{issues.length}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div class="record-detail__body">
    {#if status === 'loading'}
      <LoadingSpinner padding={32} />
    {:else if status === 'missing' || !record}
      <p class="explorer-empty">{$_('explorer_record_missing')}</p>
    {:else if tab === 'view'}
      <RecordPreview {collection} {record} />
    {:else if tab === 'record'}
      <div class="record-detail__json">
        <JsonNode value={record.value} issues={issueMap} {blobUrl} />
      </div>
    {:else if tab === 'backlinks'}
      <Backlinks target={target.uri} />
    {:else if tab === 'info'}
      <dl class="explorer-facts">
        <div><dt>AT URI</dt><dd class="explorer-facts__mono">{target.uri}</dd></div>
        <div><dt>CID</dt><dd class="explorer-facts__mono">{record.cid}</dd></div>
        <div><dt>{$_('explorer_info_size')}</dt><dd>{formatBytes(size)}</dd></div>
        {#if date}
          <div><dt>{$_('explorer_info_rkey_time')}</dt><dd>{formatDate(date, 'yyyy/MM/dd HH:mm:ss')}</dd></div>
        {/if}
      </dl>

      <section class="record-detail__section">
        <h3 class="explorer-section-title">{$_('explorer_verify_title')}</h3>
        {#if proofStatus === 'pending'}
          <LoadingSpinner padding={12} size={18} />
        {:else if !proof}
          <p class="record-detail__note"><ShieldQuestion size="16" />{$_('explorer_verify_unavailable')}</p>
        {:else}
          <ul class="record-detail__checks">
            <li class:record-detail__checks--bad={proof.signature === 'invalid'} class:record-detail__checks--ok={proof.signature === 'valid'}>
              {$_('explorer_verify_signature_' + proof.signature.replace(/-/g, '_'))}{proof.keyType ? ` (${proof.keyType})` : ''}
            </li>
            <li class:record-detail__checks--ok={proof.recordCid === record.cid} class:record-detail__checks--bad={proof.recordCid !== record.cid}>
              {$_(proof.recordCid === record.cid ? 'explorer_verify_mst_ok' : 'explorer_verify_mst_bad')}
            </li>
            <li class:record-detail__checks--ok={proof.blocksIntact} class:record-detail__checks--bad={!proof.blocksIntact}>
              {$_(proof.blocksIntact ? 'explorer_verify_blocks_ok' : 'explorer_verify_blocks_bad')}
            </li>
            <li class:record-detail__checks--ok={proof.didMatches} class:record-detail__checks--bad={!proof.didMatches}>
              {$_(proof.didMatches ? 'explorer_verify_did_ok' : 'explorer_verify_did_bad')}
            </li>
          </ul>
          <dl class="explorer-facts">
            <div><dt>Commit</dt><dd class="explorer-facts__mono">{proof.commitCid}</dd></div>
            <div><dt>Rev</dt><dd class="explorer-facts__mono">{proof.rev}</dd></div>
          </dl>
        {/if}
      </section>

      <section class="record-detail__section">
        <h3 class="explorer-section-title">{$_('explorer_schema_check_title')}</h3>
        {#if !lexicons}
          <LoadingSpinner padding={12} size={18} />
        {:else if issues === undefined}
          <p class="record-detail__note">{$_('explorer_schema_unpublished')}</p>
        {:else if !issues.length}
          <p class="record-detail__note record-detail__note--ok">{$_('explorer_schema_valid')}</p>
        {:else}
          <ul class="record-detail__issues">
            {#each issues as issue (issue.path + issue.code)}
              <li><span class="explorer-facts__mono">{issue.path}</span> {$_('explorer_issue_' + issue.code.replace(/-/g, '_'), { detail: issue.detail ?? '' })}</li>
            {/each}
          </ul>
        {/if}
      </section>

      {#if repo.pds && !repo.source?.local}
        <a class="record-detail__external" href={xrpcUrl(repo.pds, 'com.atproto.repo.getRecord', { repo: repo.did, collection, rkey })} target="_blank" rel="noopener noreferrer">
          <ExternalLink size="14" />{$_('explorer_open_on_pds')}
        </a>
      {/if}
    {:else}
      <LexiconView nsid={collection} lexicon={repo.lexicon(target.collection)} />
    {/if}
  </div>
</article>

<style lang="postcss">
  .record-detail {
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr);
      height: 100%;
      min-height: 0;

      &__head {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px 12px;
          padding: 14px 12px 10px 20px;
      }

      &__title {
          min-width: 0;
          display: grid;
          gap: 2px;
      }

      &__collection {
          font-family: var(--code-font);
          font-size: 12px;
          color: var(--text-color-3);
          overflow-wrap: anywhere;

          @media (hover: hover) {
              &:hover {
                  color: var(--link-color, var(--primary-color));
              }
          }
      }

      &__rkey {
          font-family: var(--code-font);
          font-size: 17px;
          line-height: 1.4;
          overflow-wrap: anywhere;
      }

      &__time {
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__actions {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-left: auto;
      }

      &__verdict {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 28px;
          padding: 0 10px;
          margin-right: 6px;
          border-radius: var(--radius-round, 999px);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;

          &--ok {
              color: color-mix(in oklab, var(--success-color) 70%, var(--text-color-1));
              background-color: color-mix(in oklab, var(--success-color) 14%, transparent);
          }

          &--bad {
              color: var(--danger-color);
              background-color: color-mix(in oklab, var(--danger-color) 12%, transparent);
          }
      }

      &__confirm {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin: 0 20px 10px;
          padding: 10px 12px;
          border: 1px solid var(--danger-color);
          border-radius: var(--radius-card, 8px);
          font-size: 13px;

          p {
              flex: 1 1 12em;
          }
      }

      &__body {
          overflow-y: auto;
          overscroll-behavior: contain;
          min-height: 0;
          padding: 16px 20px 32px;
      }

      &__json {
          padding-left: 20px;
      }

      &__section {
          margin-top: 24px;
      }

      &__note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-color-3);

          &--ok {
              color: var(--text-color-1);
          }
      }

      &__checks {
          list-style: none;
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
          font-size: 13px;

          li {
              padding-left: 22px;
              position: relative;
              color: var(--text-color-3);

              &::before {
                  content: '–';
                  position: absolute;
                  left: 4px;
              }
          }

          &--ok {
              color: var(--text-color-1) !important;

              &::before {
                  content: '✓' !important;
                  color: color-mix(in oklab, var(--success-color) 70%, var(--text-color-1));
              }
          }

          &--bad {
              color: var(--danger-color) !important;

              &::before {
                  content: '✕' !important;
              }
          }
      }

      &__issues {
          list-style: none;
          display: grid;
          gap: 4px;
          font-size: 13px;
          color: var(--danger-color);
      }

      &__external {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 24px;
          font-size: 13px;
          color: var(--link-color, var(--primary-color));
      }
  }
</style>
