<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { ImageEditor } from 'tokimeki-image-editor';
    import { previewSrc } from '../preview';
    import type { Draft } from './draft';
    import { drawIcon, ICON_SIZE, readPalette } from './thumbnail';
    import { COVER_HEIGHT, COVER_WIDTH, fitImage, ICON_UPLOAD_SIZE } from './image';

    const ACCEPT = 'image/png,image/jpeg,image/webp';

    let { draft = $bindable(), paletteVersion }: { draft: Draft; paletteVersion: number } = $props();

    let cropTarget: 'icon' | 'cover' | null = $state(null);
    let cropFile: File | null = $state(null);
    let imageError: string | null = $state(null);

    function choose(target: 'icon' | 'cover') {
        return (event: Event) => {
            const input = event.currentTarget as HTMLInputElement;
            const file = input.files?.[0];
            input.value = '';
            imageError = null;
            if (!file) return;
            if (!ACCEPT.split(',').includes(file.type)) {
                imageError = $_('builder_preview_image_type');
                return;
            }
            cropFile = file;
            cropTarget = target;
        };
    }

    function closeCrop() {
        cropTarget = null;
        cropFile = null;
    }

    async function cropped(_dataUrl: string, result: { blob: Blob }) {
        const target = cropTarget;
        closeCrop();
        try {
            if (target === 'icon') draft.icon = await fitImage(result.blob, ICON_UPLOAD_SIZE, ICON_UPLOAD_SIZE);
            else if (target === 'cover') draft.cover = await fitImage(result.blob, COVER_WIDTH, COVER_HEIGHT);
        } catch (e) {
            console.error(e);
            imageError = $_('builder_preview_image_failed');
        }
    }

    function autoIcon(canvas: HTMLCanvasElement) {
        paletteVersion;
        const app = document.querySelector<HTMLElement>('.app');
        const ctx = canvas.getContext('2d');
        if (app && ctx) drawIcon(ctx, readPalette(app));
    }
</script>

<div class="info">
  <section class="info__section">
    <h2 class="info__heading">{$_('builder_cover')}</h2>
    {#if draft.cover}
      <img class="info__cover" {@attach previewSrc(draft.cover)} alt="">
      <div class="info__actions">
        <label class="info__button">
          {$_('builder_change_image')}
          <input class="info__file" type="file" accept={ACCEPT} onchange={choose('cover')}>
        </label>
        <button class="info__link" onclick={() => (draft.cover = undefined)}>{$_('builder_remove_cover')}</button>
      </div>
    {:else}
      <label class="info__cover info__cover--empty">
        {$_('builder_choose_cover')}
        <input class="info__file" type="file" accept={ACCEPT} onchange={choose('cover')}>
      </label>
    {/if}
  </section>

  <section class="info__section">
    <h2 class="info__heading">{$_('builder_icon')}</h2>
    <div class="info__icon-row">
      {#if draft.icon}
        <img class="info__icon" {@attach previewSrc(draft.icon)} alt="">
      {:else}
        <canvas class="info__icon" width={ICON_SIZE} height={ICON_SIZE} {@attach autoIcon}></canvas>
      {/if}
      <div class="info__icon-side">
        {#if !draft.icon}
          <span class="info__note">{$_('builder_icon_auto')}</span>
        {/if}
        <div class="info__actions">
          <label class="info__button">
            {draft.icon ? $_('builder_change_image') : $_('builder_choose_icon')}
            <input class="info__file" type="file" accept={ACCEPT} onchange={choose('icon')}>
          </label>
          {#if draft.icon}
            <button class="info__link" onclick={() => (draft.icon = undefined)}>{$_('builder_icon_reset')}</button>
          {/if}
        </div>
      </div>
    </div>
  </section>

  {#if imageError}
    <p class="info__error" role="alert">{imageError}</p>
  {/if}

  <label class="info__field">
    <span>{$_('builder_description')}</span>
    <textarea rows="4" maxlength="300" bind:value={draft.description}></textarea>
  </label>
  <label class="info__field">
    <span>{$_('builder_version')}</span>
    <input maxlength="32" bind:value={draft.version}>
  </label>
</div>

{#if cropFile && cropTarget}
  <dialog class="info__crop" {@attach (el: HTMLDialogElement) => { if (!el.open) el.showModal(); }} onclose={closeCrop}>
    <ImageEditor
        initialImage={cropFile}
        width={1200}
        height={700}
        theme="light"
        isStandalone={false}
        cropOptions={{ cropOnly: true, aspectRatio: cropTarget === 'icon' ? 1 : 3 }}
        onComplete={cropped}
        onCancel={closeCrop}
    ></ImageEditor>
  </dialog>
{/if}

<style lang="postcss">
  .info {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 16px;
  }

  .info__section {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .info__heading {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--builder-muted);
  }

  .info__cover {
      display: block;
      width: 100%;
      aspect-ratio: 3 / 1;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid var(--builder-line);
  }

  .info__cover--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      border-style: dashed;
      border-color: #c9cdd2;
      color: var(--builder-muted);
      font-size: 13px;
      cursor: pointer;

      &:hover {
          background: var(--builder-field);
      }
  }

  .info__icon-row {
      display: flex;
      align-items: center;
      gap: 14px;
  }

  .info__icon {
      width: 72px;
      height: 72px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 18px;
      border: 1px solid var(--builder-line);
  }

  .info__icon-side {
      display: flex;
      flex-direction: column;
      gap: 6px;
  }

  .info__note {
      font-size: 13px;
      color: var(--builder-muted);
  }

  .info__actions {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .info__button {
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 12px;
      border: 1px solid #dfe2e6;
      border-radius: 9px;
      background: #fff;
      font-size: 13px;
      white-space: nowrap;
      cursor: pointer;

      &:hover {
          background: var(--builder-field);
      }

      &:focus-within {
          outline: 2px solid var(--builder-text);
          outline-offset: 2px;
      }
  }

  .info__link {
      height: 34px;
      padding: 0 8px;
      font-size: 13px;
      color: var(--builder-text);
      text-decoration: underline;
      white-space: nowrap;
  }

  .info__file {
      position: absolute;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
  }

  .info__error {
      margin: 0;
      font-size: 12px;
      color: var(--builder-danger);
  }

  .info__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
      color: var(--builder-muted);

      & textarea,
      & input {
          padding: 8px 10px;
          border: 1px solid #dfe2e6;
          border-radius: 9px;
          font: inherit;
          font-size: 14px;
          color: var(--builder-text);
          background: #fff;
          resize: vertical;
      }
  }

  .info__crop {
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
