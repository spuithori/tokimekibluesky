<script lang="ts">
  import Paperclip from '@lucide/svelte/icons/paperclip';
  import { untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import { getOwnAgent, getRepoContext, rkeyOf } from '$lib/explorer/explorerState.svelte';
  import { validateRecord, type Lexicons } from '$lib/explorer/lexicon';
  import { isNsid } from '$lib/explorer/values';
  import type { RepoRecord } from '$lib/explorer/pds';

  let { collection = '', record = undefined, onsaved, oncancel }: {
    collection?: string;
    record?: RepoRecord;
    onsaved: (record: RepoRecord, collection: string) => void;
    oncancel: () => void;
  } = $props();

  const repo = getRepoContext();
  const ownAgent = getOwnAgent();
  const seed = untrack(() => ({ record, collection }));
  const editing = seed.record !== undefined;

  function template(nsid: string): string {
    return JSON.stringify({ $type: nsid || 'com.example.record', createdAt: new Date().toISOString() }, null, 2);
  }

  let nsid = $state(seed.collection);
  let rkey = $state('');
  let text = $state(seed.record ? JSON.stringify(seed.record.value, null, 2) : template(seed.collection));
  let saving = $state(false);
  let uploading = $state(false);
  let lexicons = $state.raw<Lexicons>();
  let area = $state<HTMLTextAreaElement>();

  const parsed = $derived.by<{ value?: Record<string, unknown>; error?: string }>(() => {
    try {
      const value = JSON.parse(text);
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: $_('explorer_editor_not_object') };
      return { value };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });
  const target = $derived(nsid.trim() || (typeof parsed.value?.$type === 'string' ? parsed.value.$type : ''));
  const issues = $derived(parsed.value && lexicons ? validateRecord(parsed.value, target, lexicons) : undefined);
  const canSave = $derived(!!parsed.value && isNsid(target) && !saving);

  function loadLexicons() {
    const current = target;
    if (!isNsid(current)) return;
    repo.lexicons(current).then((result) => {
      if (current === target) lexicons = result;
    });
  }

  function insert(snippet: string) {
    const el = area;
    if (!el) return;
    const from = el.selectionStart;
    text = text.slice(0, from) + snippet + text.slice(el.selectionEnd);
    queueMicrotask(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = from + snippet.length;
    });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Tab' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      insert('  ');
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && canSave) {
      event.preventDefault();
      void save();
    }
  }

  async function upload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    const agent = ownAgent();
    input.value = '';
    if (!file || !agent) return;
    uploading = true;
    try {
      const res = await agent.uploadBlob(new Uint8Array(await file.arrayBuffer()), file.type || 'application/octet-stream');
      insert(JSON.stringify(res.blob, null, 2));
    } catch (e) {
      toast.error((e as Error)?.message || $_('explorer_error_write'));
    }
    uploading = false;
  }

  async function save() {
    const agent = ownAgent();
    const value = parsed.value;
    if (!agent || !value) return;
    saving = true;
    try {
      const res = editing
        ? await agent.xrpc.post('com.atproto.repo.putRecord', { repo: repo.did, collection: target, rkey: rkeyOf(seed.record!.uri), record: value, swapRecord: seed.record!.cid })
        : await agent.xrpc.post('com.atproto.repo.createRecord', { repo: repo.did, collection: target, rkey: rkey.trim() || undefined, record: value });
      toast.success($_('explorer_saved'));
      onsaved({ uri: res.uri, cid: res.cid, value }, target);
    } catch (e) {
      toast.error((e as Error)?.message || $_('explorer_error_write'));
    }
    saving = false;
  }

  loadLexicons();
</script>

<div class="record-editor">
  {#if !editing}
    <div class="record-editor__fields">
      <label class="record-editor__field">
        <span>Collection</span>
        <input class="explorer-filter" type="text" bind:value={nsid} onchange={loadLexicons} placeholder="$type" autocapitalize="off" spellcheck="false" />
      </label>
      <label class="record-editor__field">
        <span>Record key</span>
        <input class="explorer-filter" type="text" bind:value={rkey} placeholder={$_('explorer_editor_rkey_auto')} autocapitalize="off" spellcheck="false" />
      </label>
    </div>
  {/if}

  <textarea
    class="record-editor__area"
    bind:this={area}
    bind:value={text}
    onkeydown={handleKeydown}
    spellcheck="false"
    autocapitalize="off"
    aria-label="JSON"
    aria-invalid={!!parsed.error}
  ></textarea>

  <div class="record-editor__messages" aria-live="polite">
    {#if parsed.error}
      <p class="record-editor__error">{parsed.error}</p>
    {:else if issues?.length}
      {#each issues as issue (issue.path + issue.code)}
        <p class="record-editor__error"><span class="record-editor__path">{issue.path}</span> {$_('explorer_issue_' + issue.code.replace(/-/g, '_'), { detail: issue.detail ?? '' })}</p>
      {/each}
    {:else if issues}
      <p class="record-editor__ok">{$_('explorer_schema_valid')}</p>
    {/if}
  </div>

  <div class="record-editor__actions">
    <label class="explorer-chip record-editor__upload" aria-disabled={uploading}>
      <Paperclip size="14" />
      {$_('explorer_editor_upload')}
      <input type="file" onchange={upload} disabled={uploading} hidden />
    </label>
    <button class="button button--sm button--border" onclick={oncancel}>{$_('cancel')}</button>
    <button class="button button--sm" onclick={save} disabled={!canSave}>{$_(editing ? 'explorer_save' : 'explorer_create')}</button>
  </div>
</div>

<style lang="postcss">
  .record-editor {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
      min-height: 0;

      &__fields {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
      }

      &__field {
          display: grid;
          gap: 4px;
          font-size: 11px;
          color: var(--text-color-3);
      }

      &__area {
          flex: 1;
          width: 100%;
          min-height: 240px;
          resize: none;
          padding: 12px 14px;
          font-family: var(--code-font);
          font-size: 13px;
          line-height: 1.6;
          tab-size: 2;
          color: var(--text-color-1);
          background-color: var(--bg-color-2);
          border: 1px solid var(--border-color-1);
          border-radius: var(--radius-control, 8px);
          outline: none;

          &:focus-visible {
              border-color: var(--primary-color);
          }

          &[aria-invalid='true'] {
              border-color: var(--danger-color);
          }
      }

      &__messages {
          max-height: 96px;
          overflow-y: auto;
          font-size: 12px;
          line-height: 1.6;
      }

      &__error {
          color: var(--danger-color);
          overflow-wrap: anywhere;
      }

      &__path {
          font-family: var(--code-font);
      }

      &__ok {
          color: var(--text-color-3);
      }

      &__actions {
          display: flex;
          align-items: center;
          gap: 8px;
      }

      &__upload {
          margin-right: auto;
          cursor: pointer;
      }
  }
</style>
