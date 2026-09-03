<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import Plus from '@lucide/svelte/icons/plus';
  import Copy from '@lucide/svelte/icons/copy';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import ImagePlus from '@lucide/svelte/icons/image-plus';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { onDestroy, onMount } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import { ImageEditor } from 'tokimeki-image-editor';
  import { agent, settings } from '$lib/stores';
  import { getService } from '$lib/util';
  import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
  import Send from '@lucide/svelte/icons/send';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import {
      ATMOSPHERE_CATEGORIES,
      ATMOSPHERE_MAX_SCREENSHOTS,
      blobCid,
      blobUrl,
      fetchListedServices,
      servicePath,
      type AtmosphereBlobRef,
      type AtmosphereListedService,
  } from '$lib/atmosphere/registry';
  import {
      buildRecord,
      deleteService,
      draftFromRecord,
      draftId,
      emptyDraft,
      listOwnedServices,
      ownershipHints,
      releaseDraftUrls,
      saveService,
      submitErrorName,
      submitService,
      validateDraft,
      type OwnedService,
      type ServiceDraft,
  } from '$lib/atmosphere/manage';

  let owned = $state<OwnedService[] | null>(null);
  let loadFailed = $state(false);
  let pds = $state('');
  let formOpen = $state(false);
  let editingRkey = $state<string | null>(null);
  let editingCreatedAt = $state<string | undefined>(undefined);
  let draft = $state<ServiceDraft>(emptyDraft());
  let saving = $state(false);
  let savedUri = $state<string | null>(null);
  let deleteTarget = $state<OwnedService | null>(null);
  let listed = $state<Map<string, AtmosphereListedService> | null>(null);
  let cropFile = $state<File | null>(null);
  let submitting = $state<string | null>(null);
  let verifyTarget = $state<OwnedService | null>(null);

  const did = $derived($agent?.did() as string | undefined);

  function blobUrlOf(blob: AtmosphereBlobRef | undefined): string | null {
      const cid = blobCid(blob);
      return cid && pds && did ? blobUrl(pds, did, cid) : null;
  }

  async function loadOwned() {
      if (!$agent) return;
      loadFailed = false;
      try {
          owned = await listOwnedServices($agent);
      } catch (e) {
          console.error(e);
          loadFailed = true;
          owned = [];
      }
  }

  async function loadListed() {
      if (!did) return;
      try {
          const rows = await fetchListedServices({ did });
          listed = new Map(rows.map((row) => [row.uri, row]));
      } catch (e) {
          console.error(e);
          listed = new Map();
      }
  }

  onMount(async () => {
      if (!did) return;
      const [service] = await Promise.all([getService(did).catch(() => ''), loadOwned(), loadListed()]);
      pds = service || '';
  });

  async function submitListing(service: OwnedService) {
      if (!$agent || submitting) return;
      submitting = service.rkey;
      verifyTarget = null;
      try {
          const row = await submitService($agent, service.uri);
          listed = new Map(listed ?? []).set(row.uri, row);
          toast.success($_('atmosphere_submitted'));
      } catch (e) {
          const name = submitErrorName(e);
          if (name === 'OwnershipNotVerified') {
              verifyTarget = service;
          } else {
              console.error(e);
              toast.error(name ? $_(`atmosphere_error_${name}`) : $_('atmosphere_form_error'));
          }
      } finally {
          submitting = null;
      }
  }

  onDestroy(() => {
      releaseDraftUrls(draft);
  });

  function openCreate() {
      releaseDraftUrls(draft);
      draft = emptyDraft();
      editingRkey = null;
      editingCreatedAt = undefined;
      savedUri = null;
      formOpen = true;
  }

  function openEdit(service: OwnedService) {
      releaseDraftUrls(draft);
      draft = draftFromRecord(service.record, blobUrlOf);
      editingRkey = service.rkey;
      editingCreatedAt = service.record.createdAt;
      savedUri = null;
      formOpen = true;
  }

  function closeForm() {
      releaseDraftUrls(draft);
      draft = emptyDraft();
      editingRkey = null;
      formOpen = false;
  }

  function onIconChange(event: Event) {
      const input = event.currentTarget as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file) return;
      cropFile = file;
  }

  function handleCropComplete(_dataUrl: string, result: { blob: Blob; width: number; height: number }) {
      cropFile = null;
      const type = result.blob.type || 'image/png';
      const file = new File([result.blob], `icon.${type === 'image/jpeg' ? 'jpg' : type === 'image/webp' ? 'webp' : 'png'}`, { type });
      if (draft.iconFile && draft.iconPreviewUrl) URL.revokeObjectURL(draft.iconPreviewUrl);
      draft.iconFile = file;
      draft.iconPreviewUrl = URL.createObjectURL(file);
  }

  function handleCropCancel() {
      cropFile = null;
  }

  function onScreenshotsChange(event: Event) {
      const input = event.currentTarget as HTMLInputElement;
      const files = Array.from(input.files ?? []);
      for (const file of files) {
          if (draft.screenshots.length >= ATMOSPHERE_MAX_SCREENSHOTS) break;
          draft.screenshots.push({ id: draftId(), file, previewUrl: URL.createObjectURL(file), existing: null, alt: '' });
      }
      input.value = '';
  }

  function removeScreenshot(id: string) {
      const index = draft.screenshots.findIndex((shot) => shot.id === id);
      if (index === -1) return;
      const [shot] = draft.screenshots.splice(index, 1);
      if (shot.file && shot.previewUrl) URL.revokeObjectURL(shot.previewUrl);
  }

  function moveScreenshot(id: string, delta: number) {
      const index = draft.screenshots.findIndex((shot) => shot.id === id);
      const next = index + delta;
      if (index === -1 || next < 0 || next >= draft.screenshots.length) return;
      const [shot] = draft.screenshots.splice(index, 1);
      draft.screenshots.splice(next, 0, shot);
  }

  function addLocalized() {
      draft.localized.push({ id: draftId(), lang: '', name: '', tagline: '', description: '' });
  }

  function removeLocalized(id: string) {
      draft.localized = draft.localized.filter((item) => item.id !== id);
  }

  async function submit(event: SubmitEvent) {
      event.preventDefault();
      if (!$agent || saving) return;

      const missing = validateDraft(draft);
      if (missing) {
          toast.error($_(`atmosphere_form_required_${missing}`));
          return;
      }

      saving = true;
      try {
          const record = await buildRecord($agent, draft, editingCreatedAt);
          const result = await saveService($agent, record, editingRkey ?? undefined);
          toast.success($_('atmosphere_form_saved'));
          await loadOwned();
          if (editingRkey) {
              const updated = owned?.find((item) => item.rkey === editingRkey);
              if (updated) openEdit(updated);
          } else {
              closeForm();
          }
          savedUri = result.uri;
      } catch (e) {
          console.error(e);
          toast.error($_('atmosphere_form_error'));
      } finally {
          saving = false;
      }
  }

  async function confirmDelete() {
      if (!$agent || !deleteTarget) return;
      const target = deleteTarget;
      deleteTarget = null;
      try {
          await deleteService($agent, target.rkey);
          if (editingRkey === target.rkey) closeForm();
          if (savedUri === target.uri) savedUri = null;
          await loadOwned();
      } catch (e) {
          console.error(e);
          toast.error($_('atmosphere_form_error'));
      }
  }

  async function copyUri(uri: string) {
      try {
          await navigator.clipboard.writeText(uri);
          toast.success($_('atmosphere_copied'));
      } catch {
          toast.error($_('atmosphere_form_error'));
      }
  }
</script>

<svelte:head>
  <title>{$_('atmosphere_register_title')} - TOKIMEKI</title>
</svelte:head>

<div class="column-heading">
  <div class="column-heading__buttons">
    <button class="settings-back" onclick={() => {history.back()}}>
      <ArrowLeft color="var(--text-color-1)" />
    </button>
  </div>

  <h1 class="column-heading__title">{$_('atmosphere_register_title')}</h1>

  <div class="column-heading__buttons column-heading__buttons--right">
    <a class="settings-back" href="/">
      <X color="var(--text-color-1)" />
    </a>
  </div>
</div>

<div class="register">
  {#if !did}
    <p class="register-status">{$_('atmosphere_register_login_required')}</p>
  {:else}
    <p class="register-intro">{$_('atmosphere_register_intro')}</p>

    {#if savedUri}
      <div class="register-saved">
        <p class="register-saved__title">{$_('atmosphere_uri_hint')}</p>
        <div class="register-saved__uri">
          <code>{savedUri}</code>
          <button class="register-icon-button" type="button" onclick={() => copyUri(savedUri as string)} aria-label={$_('atmosphere_copy_uri')}>
            <Copy size="16" color="var(--text-color-1)" />
          </button>
        </div>
      </div>
    {/if}

    <section class="register-section">
      <div class="register-section__head">
        <h2 class="register-section__title">{$_('atmosphere_my_services')}</h2>
        <button class="button button--sm" type="button" onclick={openCreate}>
          <Plus size="16" />
          {$_('atmosphere_new_service')}
        </button>
      </div>

      {#if owned === null}
        <p class="register-status">{$_('atmosphere_loading')}</p>
      {:else if loadFailed}
        <p class="register-status">{$_('atmosphere_community_error')}</p>
      {:else if owned.length === 0}
        <p class="register-status">{$_('atmosphere_my_services_empty')}</p>
      {:else}
        <ul class="owned-list">
          {#each owned as service (service.rkey)}
            <li class="owned-item" class:owned-item--editing={editingRkey === service.rkey}>
              {#if blobUrlOf(service.record.icon)}
                <img class="owned-item__icon" src={blobUrlOf(service.record.icon)} alt="" width="48" height="48" loading="lazy" decoding="async">
              {:else}
                <span class="owned-item__icon owned-item__icon--fallback" aria-hidden="true">{[...service.record.name][0] ?? ''}</span>
              {/if}

              <div class="owned-item__body">
                <p class="owned-item__name">
                  {service.record.name}
                  {#if listed?.has(service.uri)}
                    <span class="owned-item__status owned-item__status--listed">{$_('atmosphere_status_listed')}</span>
                  {:else if listed}
                    <span class="owned-item__status">{$_('atmosphere_status_unlisted')}</span>
                  {/if}
                </p>
                <div class="owned-item__uri">
                  <code>{service.uri}</code>
                  <button class="register-icon-button" type="button" onclick={() => copyUri(service.uri)} aria-label={$_('atmosphere_copy_uri')}>
                    <Copy size="14" color="var(--text-color-3)" />
                  </button>
                </div>
              </div>

              <div class="owned-item__actions">
                {#if listed && !listed.has(service.uri)}
                  <button class="owned-item__action owned-item__action--primary" type="button" disabled={submitting !== null} onclick={() => submitListing(service)}>
                    <Send size="14" />
                    {submitting === service.rkey ? $_('atmosphere_submitting') : $_('atmosphere_submit')}
                  </button>
                {/if}
                <a class="owned-item__action" href={servicePath(did, service.rkey)}>{$_('atmosphere_preview')}</a>
                <button class="owned-item__action" type="button" onclick={() => openEdit(service)}>{$_('atmosphere_edit')}</button>
                <button class="owned-item__action owned-item__action--danger" type="button" onclick={() => {deleteTarget = service}}>{$_('delete')}</button>
              </div>
            </li>

            {#if verifyTarget?.rkey === service.rkey}
              {@const hints = ownershipHints(service.record.url, did)}
              <li class="verify-panel">
                <p class="verify-panel__title"><ShieldCheck size="18" color="var(--primary-color)" /> {$_('atmosphere_verify_title')}</p>
                <p class="verify-panel__text">{$_('atmosphere_verify_intro').replace('{host}', hints.host)}</p>

                <div class="verify-panel__code">
                  <code>{hints.dnsName}</code>
                  <span class="verify-panel__sep">TXT</span>
                  <code>{hints.dnsValue}</code>
                  <button class="register-icon-button" type="button" onclick={() => copyUri(hints.dnsValue)} aria-label={$_('atmosphere_copy_uri')}>
                    <Copy size="14" color="var(--text-color-3)" />
                  </button>
                </div>
                <p class="verify-panel__note">{$_('atmosphere_verify_multi')}</p>

                <div class="verify-panel__actions">
                  <button class="button button--sm" type="button" disabled={submitting !== null} onclick={() => submitListing(service)}>{$_('atmosphere_submit_retry')}</button>
                  <button class="button button--sm button--border" type="button" onclick={() => {verifyTarget = null}}>{$_('close')}</button>
                </div>
              </li>
            {/if}
          {/each}
        </ul>
      {/if}
    </section>

    {#if formOpen}
      <form class="service-form" onsubmit={submit}>
        <h2 class="register-section__title">{editingRkey ? $_('atmosphere_edit') : $_('atmosphere_new_service')}</h2>

        <div class="service-form__grid">
          <div class="service-form__main">
            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_name')} *</dt>
              <dd class="settings-group__content">
                <div class="input-text">
                  <input class="input-text__input" type="text" bind:value={draft.name} maxlength="64" required>
                </div>
              </dd>
            </dl>

            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_tagline')}</dt>
              <dd class="settings-group__content">
                <div class="input-text">
                  <input class="input-text__input" type="text" bind:value={draft.tagline} maxlength="64">
                </div>
              </dd>
            </dl>

            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_url')} *</dt>
              <dd class="settings-group__content">
                <div class="input-text">
                  <input class="input-text__input" type="url" bind:value={draft.url} placeholder="https://" required>
                </div>
              </dd>
            </dl>

            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_category')}</dt>
              <dd class="settings-group__content">
                <div class="form-select">
                  <ChevronDown size={20} color="var(--primary-color)" />

                  <select class="form-select__select" bind:value={draft.category}>
                    <option value="">{$_('atmosphere_form_category_none')}</option>
                    {#each ATMOSPHERE_CATEGORIES as category (category)}
                      <option value={category}>{$_(`atmosphere_category_${category}`)}</option>
                    {/each}
                  </select>
                </div>
              </dd>
            </dl>

            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_description')} *</dt>
              <dd class="settings-group__content">
                <textarea class="form-textarea service-form__textarea" bind:value={draft.description} rows="8" required></textarea>
              </dd>
            </dl>
          </div>

          <div class="service-form__side">
            <dl class="settings-group">
              <dt class="settings-group__name">{$_('atmosphere_form_icon')}</dt>
              <dd class="settings-group__content">
                <label class="icon-picker">
                  {#if draft.iconPreviewUrl}
                    <img class="icon-picker__preview" src={draft.iconPreviewUrl} alt="" width="96" height="96">
                  {:else}
                    <span class="icon-picker__placeholder"><ImagePlus size="24" color="var(--text-color-3)" /></span>
                  {/if}
                  <input class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onchange={onIconChange}>
                </label>
                <p class="settings-group__description">{$_('atmosphere_form_icon_hint')}</p>
              </dd>
            </dl>
          </div>
        </div>

        <dl class="settings-group">
          <dt class="settings-group__name">{$_('atmosphere_form_screenshots')}</dt>
          <dd class="settings-group__content">
            <div class="shots-editor">
              {#each draft.screenshots as shot, index (shot.id)}
                <div class="shots-editor__item">
                  <img class="shots-editor__image" src={shot.previewUrl} alt="" loading="lazy" decoding="async">
                  <input class="shots-editor__alt" type="text" bind:value={shot.alt} placeholder={$_('atmosphere_form_screenshot_alt')} maxlength="300">
                  <div class="shots-editor__actions">
                    <button class="register-icon-button" type="button" disabled={index === 0} onclick={() => moveScreenshot(shot.id, -1)} aria-label="←">←</button>
                    <button class="register-icon-button" type="button" disabled={index === draft.screenshots.length - 1} onclick={() => moveScreenshot(shot.id, 1)} aria-label="→">→</button>
                    <button class="register-icon-button" type="button" onclick={() => removeScreenshot(shot.id)} aria-label={$_('remove')}>
                      <Trash2 size="16" color="var(--danger-color)" />
                    </button>
                  </div>
                </div>
              {/each}

              {#if draft.screenshots.length < ATMOSPHERE_MAX_SCREENSHOTS}
                <label class="shots-editor__add">
                  <ImagePlus size="24" color="var(--text-color-3)" />
                  <input class="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onchange={onScreenshotsChange}>
                </label>
              {/if}
            </div>
            <p class="settings-group__description">{$_('atmosphere_form_screenshots_hint')}</p>
          </dd>
        </dl>

        <dl class="settings-group">
          <dt class="settings-group__name">{$_('atmosphere_form_localized')}</dt>
          <dd class="settings-group__content">
            <p class="settings-group__description">{$_('atmosphere_form_localized_hint')}</p>

            {#each draft.localized as item (item.id)}
              <div class="localized-item">
                <div class="localized-item__row">
                  <div class="input-text localized-item__lang">
                    <input class="input-text__input" type="text" bind:value={item.lang} placeholder="ja" maxlength="16">
                  </div>
                  <div class="input-text">
                    <input class="input-text__input" type="text" bind:value={item.name} placeholder={$_('atmosphere_form_name')} maxlength="64">
                  </div>
                  <div class="input-text">
                    <input class="input-text__input" type="text" bind:value={item.tagline} placeholder={$_('atmosphere_form_tagline')} maxlength="64">
                  </div>
                  <button class="register-icon-button" type="button" onclick={() => removeLocalized(item.id)} aria-label={$_('remove')}>
                    <Trash2 size="16" color="var(--danger-color)" />
                  </button>
                </div>
                <textarea class="form-textarea service-form__textarea" bind:value={item.description} rows="4" placeholder={$_('atmosphere_form_description')}></textarea>
              </div>
            {/each}

            <button class="button button--sm button--border" type="button" onclick={addLocalized}>
              <Plus size="16" />
              {$_('atmosphere_form_add_localized')}
            </button>
          </dd>
        </dl>

        <div class="service-form__footer">
          <button class="button button--border" type="button" onclick={closeForm} disabled={saving}>{$_('cancel')}</button>
          <button class="button" type="submit" disabled={saving}>
            {saving ? $_('atmosphere_form_saving') : editingRkey ? $_('atmosphere_form_update') : $_('atmosphere_form_create')}
          </button>
        </div>
      </form>
    {/if}
  {/if}
</div>

{#if cropFile}
  <dialog class="crop-dialog" {@attach (el: HTMLDialogElement) => { if (!el.open) el.showModal(); }} onclose={handleCropCancel}>
    <ImageEditor
        initialImage={cropFile}
        width={1200}
        height={700}
        theme={$settings?.design?.darkmode ? 'dark' : 'light'}
        isStandalone={false}
        cropOptions={{
            cropOnly: true,
            aspectRatio: 1,
            circularGuide: false,
        }}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
    ></ImageEditor>
  </dialog>
{/if}

{#if deleteTarget}
  <ConfirmModal
    yesText={$_('delete')}
    cancelText={$_('cancel')}
    onok={confirmDelete}
    oncancel={() => {deleteTarget = null}}
  >
    <p>{$_('atmosphere_delete_confirm')}</p>
    <p><strong>{deleteTarget.record.name}</strong></p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .register {
      padding: 16px 32px 40px;

      @media (max-width: 767px) {
          padding: 12px 12px 32px;
      }
  }

  .register-intro {
      font-size: 14px;
      line-height: 1.6;
      color: var(--text-color-2);
      white-space: pre-line;
  }

  .register-status {
      padding: 16px 0;
      font-size: 14px;
      color: var(--text-color-3);
  }

  .register-saved {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: var(--border-radius-4);
      background-color: var(--bg-color-3);

      &__title {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-color-2);
          white-space: pre-line;
      }

      &__uri {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;

          code {
              font-size: 12px;
              color: var(--text-color-1);
              overflow-wrap: anywhere;
              user-select: all;
          }
      }
  }

  .register-section {
      margin-top: 24px;

      &__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
      }

      &__title {
          font-size: 18px;
          font-weight: bold;
          letter-spacing: .02em;
          color: var(--text-color-1);
      }
  }

  .register-icon-button {
      display: grid;
      place-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--border-radius-2);
      color: var(--text-color-1);

      &:hover {
          background-color: var(--bg-color-3);
      }

      &:disabled {
          opacity: .3;
      }
  }

  .owned-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
  }

  .owned-item {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: var(--border-radius-4);

      &--editing {
          background-color: var(--bg-color-2);
      }

      @media (max-width: 767px) {
          grid-template-columns: 48px 1fr;
      }

      &__icon {
          width: 48px;
          height: 48px;
          border-radius: 11px;
          object-fit: cover;
          background-color: var(--bg-color-3);

          &--fallback {
              display: grid;
              place-content: center;
              font-weight: bold;
              color: var(--text-color-3);
          }
      }

      &__body {
          min-width: 0;
      }

      &__name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: bold;
          color: var(--text-color-1);
      }

      &__status {
          padding: 1px 8px;
          border-radius: 999px;
          background-color: var(--bg-color-3);
          color: var(--text-color-3);
          font-size: 11px;
          font-weight: normal;

          &--listed {
              background-color: var(--primary-color);
              color: var(--bg-color-1);
          }
      }

      &__uri {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 0;

          code {
              font-size: 11px;
              color: var(--text-color-3);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }
      }

      &__actions {
          display: flex;
          gap: 4px;

          @media (max-width: 767px) {
              grid-column: 2;
          }
      }

      &__action {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 13px;
          color: var(--primary-color);
          background-color: var(--bg-color-3);

          &:hover {
              text-decoration: none;
              background-color: var(--border-color-1);
          }

          &--danger {
              color: var(--danger-color);
          }

          &--primary {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              background-color: var(--primary-color);
              color: var(--bg-color-1);

              &:hover {
                  background-color: var(--primary-color);
                  opacity: .85;
              }

              &:disabled {
                  opacity: .5;
              }
          }
      }
  }

  .verify-panel {
      margin: 4px 0 8px;
      padding: 16px;
      border-radius: var(--border-radius-4);
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);

      &__title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 15px;
          font-weight: bold;
          color: var(--text-color-1);
      }

      &__text {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-color-2);
      }

      &__note {
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-color-3);
      }

      &__code {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 12px;

          code {
              padding: 2px 8px;
              border-radius: var(--border-radius-2);
              background-color: var(--bg-color-3);
              font-size: 12px;
              color: var(--text-color-1);
              user-select: all;
              overflow-wrap: anywhere;
          }
      }

      &__sep {
          font-size: 12px;
          color: var(--text-color-3);
      }

      &__actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
      }
  }

  .service-form {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color-2);

      &__grid {
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 0 32px;

          @media (max-width: 767px) {
              grid-template-columns: 1fr;
          }
      }

      &__textarea {
          min-height: 120px;
          font-size: 14px;
          line-height: 1.6;
      }

      &__footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 16px;

          @media (max-width: 767px) {
              flex-direction: column-reverse;
          }
      }
  }

  .icon-picker {
      display: block;
      width: 96px;
      height: 96px;
      border-radius: 22px;
      overflow: hidden;
      cursor: pointer;
      background-color: var(--bg-color-3);
      box-shadow: inset 0 0 0 1px var(--border-color-2);

      &__preview {
          width: 96px;
          height: 96px;
          object-fit: cover;
      }

      &__placeholder {
          display: grid;
          place-content: center;
          width: 100%;
          height: 100%;
      }
  }

  .shots-editor {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;

      &__item {
          flex-shrink: 0;
          width: 220px;
          display: flex;
          flex-direction: column;
          gap: 6px;
      }

      &__image {
          width: 220px;
          height: 140px;
          object-fit: cover;
          border-radius: var(--border-radius-3);
          background-color: var(--bg-color-3);
      }

      &__alt {
          height: 32px;
          padding: 0 10px;
          border: 1px solid var(--border-color-1);
          border-radius: var(--border-radius-2);
          color: var(--text-color-1);
          font-size: 12px;
      }

      &__actions {
          display: flex;
          gap: 4px;
      }

      &__add {
          flex-shrink: 0;
          display: grid;
          place-content: center;
          width: 140px;
          height: 140px;
          border-radius: var(--border-radius-3);
          border: 2px dashed var(--border-color-1);
          cursor: pointer;
      }
  }

  .localized-item {
      margin-top: 12px;
      padding: 12px;
      border-radius: var(--border-radius-3);
      background-color: var(--bg-color-2);

      &__row {
          display: grid;
          grid-template-columns: 80px 1fr 1fr auto;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;

          @media (max-width: 767px) {
              grid-template-columns: 80px 1fr auto;

              > :nth-child(3) {
                  grid-column: 1 / -1;
              }
          }
      }
  }

  .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
  }

  .crop-dialog {
      width: 100dvw;
      height: 100dvh;
      max-width: none;
      max-height: none;
      margin: 0;
      padding: 0;
      border: none;
      background-color: #1a1a1af2;
      backdrop-filter: blur(10px);

      &[open] {
          display: grid;
          place-items: center;
      }

      &::backdrop {
          background-color: transparent;
      }
  }
</style>
