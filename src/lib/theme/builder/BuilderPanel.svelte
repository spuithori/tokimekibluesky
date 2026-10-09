<script lang="ts">
    import { onDestroy, untrack } from 'svelte';
    import { get } from 'svelte/store';
    import { _ } from 'tokimeki-i18n';
    import X from '@lucide/svelte/icons/x';
    import Link from '@lucide/svelte/icons/link';
    import { toast } from 'svelte-sonner';
    import { agent, settings, theme } from '$lib/stores';
    import { validateThemeRecord, type ThemeRecord } from '../format';
    import { composeRecord, previewRecord, type Draft } from './draft';
    import { deleteDraft, saveDraft } from './storage';
    import { builderHref, draftSignature, editDraftId } from './session';
    import { encodeThemeHash } from './link';
    import { readContrast, renderIcon, type ContrastReading } from './thumbnail';
    import { publishDraft, PublishError, type Published } from './publish';
    import EasyTab from './EasyTab.svelte';
    import AdvancedTab from './AdvancedTab.svelte';
    import VariantsTab from './VariantsTab.svelte';
    import InfoTab from './InfoTab.svelte';
    import PublishedView from './PublishedView.svelte';

    type Tab = 'easy' | 'advanced' | 'variants' | 'info';
    const TABS: Tab[] = ['easy', 'advanced', 'variants', 'info'];
    const THEME_IMAGE = /theme-image\(\s*([a-zA-Z0-9_-]+)\s*\)/g;

    let {
        draft = $bindable(),
        persisted,
        onpersist,
        onpublish,
        onclose,
    }: {
        draft: Draft;
        persisted: boolean;
        onpersist: (id: string) => void;
        onpublish: (uri: string) => void;
        onclose: () => void;
    } = $props();

    const app = document.querySelector<HTMLElement>('.app');
    const original = {
        theme: get(theme),
        dark: app?.classList.contains('darkmode') ?? false,
        bubble: app?.classList.contains('bubble') ?? false,
    };

    let tab: Tab = $state('easy');
    let previewDark = $state(original.dark);
    let previewBubble = $state(original.bubble);
    let variantKey: string | undefined = $state(draft.variants[0]?.key);
    let expanded = $state(false);
    let contrast: ContrastReading | null = $state(null);
    let publishing = $state(false);
    let publishError: string | null = $state(null);
    let published: Published | null = $state(null);
    let thumbnailUrl: string | null = $state(null);
    let paletteVersion = $state(0);

    const composed = $derived(composeRecord(draft));

    async function copyLink() {
        const hash = await encodeThemeHash(composed);
        await navigator.clipboard.writeText(new URL(builderHref({ kind: 'link', hash }), location.origin).href);
        toast.success($_(draft.images.length || draft.icon || draft.cover ? 'builder_link_copied_without_images' : 'builder_link_copied'));
    }
    const errors = $derived.by(() => {
        const placeholder = (blob: Blob) => ({ $type: 'blob', ref: { $link: 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }, mimeType: blob.type, size: blob.size });
        const result = validateThemeRecord({ ...composed, images: draft.images.map((image) => ({ key: image.key, image: placeholder(image.blob) })) });
        return result.ok ? [] : result.errors;
    });
    const imageUrls = $derived(Object.fromEntries(draft.images.map((image) => [image.key, URL.createObjectURL(image.blob)])));

    $effect(() => {
        const urls = imageUrls;
        return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    });

    let frame = 0;
    let lastPreview: (() => void) | null = null;
    const PREVIEW_ID = 'preview:builder';

    const stopWatching = theme.subscribe((value) => {
        if (value?.id === PREVIEW_ID) return;
        original.theme = value;
        if (lastPreview) {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(lastPreview);
        }
    });

    function apply(record: ThemeRecord, urls: Record<string, string>, dark: boolean, bubble: boolean) {
        const tokens = record.tokens.map((t) => (t.value.includes('theme-image(') ? { name: t.name, value: t.value.replace(THEME_IMAGE, (_m, key: string) => (urls[key] ? `url("${urls[key]}")` : 'none')) } : t));
        theme.set({ id: PREVIEW_ID, record: { ...record, tokens }, installedAt: '' });
        app?.classList.toggle('darkmode', dark);
        app?.classList.toggle('bubble', bubble);
        requestAnimationFrame(() => {
            if (app) contrast = readContrast(app);
            paletteVersion++;
        });
    }

    $effect(() => {
        const record = previewRecord(composed, { dark: previewDark, variant: variantKey }) as ThemeRecord;
        const urls = imageUrls;
        const dark = previewDark;
        const bubble = previewBubble;
        lastPreview = () => apply(record, urls, dark, bubble);
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(lastPreview);
    });

    let saveHandle = 0;
    const idle = (callback: () => void): number => (window.requestIdleCallback ? window.requestIdleCallback(callback) : window.setTimeout(callback, 200));
    const cancelIdle = (handle: number) => (window.cancelIdleCallback ? window.cancelIdleCallback(handle) : window.clearTimeout(handle));

    let saved = draftSignature(draft);
    let stored = untrack(() => persisted);
    let saving: Promise<void> = Promise.resolve();

    function persist(snapshot: Draft, signature: string) {
        if (publishing) return;
        saving = saving.then(async () => {
            await saveDraft(snapshot);
            saved = signature;
            if (!stored) {
                stored = true;
                onpersist(snapshot.id);
            }
        }).catch((e) => console.error(e));
    }

    $effect(() => {
        const signature = draftSignature(draft);
        cancelIdle(saveHandle);
        if (signature === saved || publishing) return;
        const snapshot = $state.snapshot(draft) as Draft;
        saveHandle = idle(() => persist(snapshot, signature));
    });

    onDestroy(() => {
        stopWatching();
        cancelAnimationFrame(frame);
        cancelIdle(saveHandle);
        if (!publishing && draftSignature(draft) !== saved) saveDraft($state.snapshot(draft) as Draft).catch((e) => console.error(e));
        theme.set(original.theme);
        app?.classList.toggle('darkmode', original.dark);
        app?.classList.toggle('bubble', original.bubble);
        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    });

    async function nextFrames() {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }

    async function publish() {
        const account = get(agent);
        if (!account || !app || errors.length) return;
        publishing = true;
        publishError = null;
        cancelIdle(saveHandle);
        try {
            let autoIcon: Blob | null = null;
            if (!draft.icon) {
                cancelAnimationFrame(frame);
                apply(previewRecord(composed, { dark: false, variant: variantKey }) as ThemeRecord, imageUrls, false, previewBubble);
                await nextFrames();
                autoIcon = await renderIcon(app);
                apply(previewRecord(composed, { dark: previewDark, variant: variantKey }) as ThemeRecord, imageUrls, previewDark, previewBubble);
            }
            const snapshot = $state.snapshot(draft) as Draft;
            const result = await publishDraft(account, snapshot, autoIcon);
            const previousId = draft.id;
            draft.id = editDraftId(result.uri);
            draft.sourceUri = result.uri;
            draft.rkey = result.rkey;
            draft.createdAt = result.installed.record.createdAt;
            saved = draftSignature(draft);
            stored = false;
            await saving;
            await Promise.all([deleteDraft(previousId), deleteDraft(draft.id)]);
            onpublish(result.uri);
            original.theme = result.installed;
            $settings.design.skin = result.installed.id;
            if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
            thumbnailUrl = result.installed.thumbnail ? URL.createObjectURL(result.installed.thumbnail) : null;
            published = result;
        } catch (e) {
            console.error(e);
            publishError = e instanceof PublishError && e.details.length ? e.details.join(' / ') : $_('builder_publish_error');
        } finally {
            publishing = false;
        }
    }
</script>

<aside class="builder" class:builder--expanded={expanded} aria-label={$_('builder_title')}>
  <button class="builder__grabber" aria-label={$_('builder_sheet')} aria-expanded={expanded} onclick={() => (expanded = !expanded)}>
    <span></span>
  </button>

  <header class="builder__header">
    <input class="builder__name" aria-label={$_('builder_name')} bind:value={draft.name} maxlength="64">
    <button class="builder__icon-button" aria-label={$_('builder_copy_link')} title={$_('builder_copy_link')} onclick={copyLink}>
      <Link size={20} color="currentColor"></Link>
    </button>
    <button class="builder__icon-button" aria-label={$_('builder_close')} onclick={onclose}>
      <X size={20} color="currentColor"></X>
    </button>
  </header>

  {#if published}
    <PublishedView {published} {thumbnailUrl} oncontinue={() => (published = null)} onupdate={(next) => { if (published) published = next; }}></PublishedView>
  {:else}
    <div class="builder__preview">
      <div class="builder__segment" role="group" aria-label={$_('builder_preview_mode')}>
        <button aria-pressed={!previewDark} onclick={() => (previewDark = false)}>{$_('builder_light')}</button>
        <button aria-pressed={previewDark} onclick={() => (previewDark = true)}>{$_('builder_dark')}</button>
      </div>
      <label class="builder__check">
        <input type="checkbox" bind:checked={previewBubble}>
        {$_('builder_bubble')}
      </label>
    </div>

    <nav class="builder__tabs" aria-label={$_('builder_tabs')}>
      {#each TABS as value (value)}
        <button class="builder__tab" aria-current={tab === value ? 'page' : undefined} onclick={() => (tab = value)}>{$_(`builder_tab_${value}`)}</button>
      {/each}
    </nav>

    <div class="builder__body">
      {#if tab === 'easy'}
        <EasyTab bind:draft {contrast} onvariants={() => (tab = 'variants')}></EasyTab>
      {:else if tab === 'advanced'}
        <AdvancedTab bind:draft {composed} dark={previewDark}></AdvancedTab>
      {:else if tab === 'variants'}
        <VariantsTab bind:draft bind:selected={variantKey}></VariantsTab>
      {:else}
        <InfoTab bind:draft {paletteVersion}></InfoTab>
      {/if}
    </div>

    <footer class="builder__footer">
      {#if errors.length}
        <p class="builder__blocked" role="status">{$_('builder_publish_blocked', { count: errors.length })}</p>
      {:else if publishError}
        <p class="builder__blocked" role="alert">{publishError}</p>
      {:else if !$agent}
        <p class="builder__blocked" role="status">{$_('builder_login_required')}</p>
      {/if}
      <button class="builder__publish" onclick={publish} disabled={publishing || errors.length > 0 || !$agent}>{$_('builder_publish')}</button>
    </footer>
  {/if}
</aside>

<style lang="postcss">
  .builder {
      --builder-text: #17181a;
      --builder-muted: #5f6368;
      --builder-line: #e6e8eb;
      --builder-field: #f1f2f4;
      --builder-danger: #b3261e;

      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 2002;
      width: 400px;
      display: flex;
      flex-direction: column;
      background: #fff;
      color: var(--builder-text);
      border-left: 1px solid var(--builder-line);
      box-shadow: -8px 0 24px rgba(20, 20, 30, .08);
      font-size: 14px;
      color-scheme: light;
  }

  .builder :global(input[type='checkbox']) {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin: 0;
      visibility: visible;
      accent-color: var(--builder-text);
  }

  .builder > :global(*) {
      flex-shrink: 0;
  }

  .builder__grabber {
      display: none;
  }

  .builder__header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 12px 12px 16px;
      border-bottom: 1px solid var(--builder-line);
  }

  .builder__name {
      flex-grow: 1;
      min-width: 0;
      border: 0;
      padding: 6px 0;
      background: transparent;
      color: var(--builder-text);
      font: inherit;
      font-size: 16px;
      font-weight: 700;
  }

  .builder__icon-button {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: var(--builder-muted);

      &:hover {
          background: var(--builder-field);
      }
  }

  .builder__preview {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--builder-line);
  }

  .builder__segment {
      display: flex;
      gap: 2px;
      padding: 3px;
      background: var(--builder-field);
      border-radius: 9px;

      & button {
          padding: 6px 14px;
          border-radius: 7px;
          font-size: 13px;
          color: var(--builder-text);
      }

      & button[aria-pressed='true'] {
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
      }
  }

  .builder__check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--builder-muted);
  }

  .builder__tabs {
      display: flex;
      gap: 4px;
      padding: 8px 12px 0;
      border-bottom: 1px solid var(--builder-line);
      overflow-x: auto;
  }

  .builder__tab {
      padding: 10px 12px;
      color: var(--builder-muted);
      border-bottom: 2px solid transparent;
      white-space: nowrap;

      &[aria-current='page'] {
          color: var(--builder-text);
          font-weight: 600;
          border-bottom-color: var(--builder-text);
      }
  }

  .builder__body {
      flex: 1 1 0;
      min-height: 0;
      overflow: auto;
  }

  .builder__footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--builder-line);
  }

  .builder__blocked {
      margin: 0;
      font-size: 12px;
      color: var(--builder-danger);
  }

  .builder__publish {
      height: 44px;
      border-radius: 10px;
      background: var(--builder-text);
      color: #fff;
      font-weight: 600;

      &:disabled {
          background: #c9cbcf;
      }
  }

  @media (max-width: 767px) {
      .builder {
          top: auto;
          left: 0;
          width: auto;
          height: 50dvh;
          border-left: 0;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -8px 24px rgba(20, 20, 30, .14);
          padding-bottom: env(safe-area-inset-bottom);
      }

      .builder--expanded {
          height: 88dvh;
      }

      .builder__grabber {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 22px;

          & span {
              width: 40px;
              height: 5px;
              border-radius: 3px;
              background: #d4d6da;
          }
      }

      .builder__icon-button {
          width: 44px;
          height: 44px;
      }
  }
</style>
