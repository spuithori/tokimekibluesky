<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import ImageUp from '@lucide/svelte/icons/image-up';
    import { LIMITS } from '../format';
    import { hasVariants, seedBase, type Draft } from './draft';
    import type { DeckLayout, ShadowPreset, SurfacePreset } from './derive';
    import type { ContrastReading } from './thumbnail';

    const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
    const BACKGROUND = 'background';

    let { draft = $bindable(), contrast, onvariants }: { draft: Draft; contrast: ContrastReading | null; onvariants: () => void } = $props();

    const base = $derived(seedBase(draft));
    const inferredLayout: DeckLayout = $derived(draft.tokens.findLast((t) => t.name === '--decks-gap')?.value.trim().replace(/px$/, '') === '0' ? 'joined' : 'separate');
    const layout = $derived(draft.seeds.layout ?? inferredLayout);
    const textCustom = $derived(!!draft.seeds.text);
    const background = $derived(draft.images.find((image) => image.key === BACKGROUND));
    const backgroundUrl = $derived(background ? URL.createObjectURL(background.blob) : null);
    let imageError: string | null = $state(null);

    $effect(() => {
        const url = backgroundUrl;
        return () => {
            if (url) URL.revokeObjectURL(url);
        };
    });

    const layouts: Array<[DeckLayout, string]> = [['separate', 'builder_layout_separate'], ['joined', 'builder_layout_joined']];
    const shadows: Array<[ShadowPreset, string]> = [['none', 'builder_shadow_none'], ['soft', 'builder_shadow_soft'], ['strong', 'builder_shadow_strong']];
    const surfaces: Array<[SurfacePreset, string]> = [['solid', 'builder_surface_solid'], ['glass', 'builder_surface_glass']];

    const ratio = (value: number) => `${value.toFixed(1)}:1`;
    const level = (value: number, min: number) => (value >= min ? 'ok' : value >= 3 ? 'warn' : 'bad');

    function chooseImage(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        imageError = null;
        if (!file) return;
        if (!IMAGE_TYPES.includes(file.type)) {
            imageError = $_('builder_image_type');
            return;
        }
        if (file.size > LIMITS.imageSize) {
            imageError = $_('builder_image_too_large');
            return;
        }
        draft.images = [...draft.images.filter((image) => image.key !== BACKGROUND), { key: BACKGROUND, blob: file }];
        draft.overrides['--base-bg-image'] = `theme-image(${BACKGROUND})`;
        draft.overrides['--base-dark-bg-image'] = `theme-image(${BACKGROUND})`;
    }

    function removeImage() {
        draft.images = draft.images.filter((image) => image.key !== BACKGROUND);
        draft.overrides['--base-bg-image'] = null;
        draft.overrides['--base-dark-bg-image'] = null;
    }
</script>

<div class="easy">
  <section class="easy__section">
    <h2 class="easy__heading">{$_('builder_section_colors')}</h2>

    {#if hasVariants(draft)}
      <div class="easy__row">
        <span class="easy__swatch" style:background={draft.variants[0]?.swatch}></span>
        <span class="easy__label">{$_('builder_accent')}</span>
        <button class="easy__link" onclick={onvariants}>{$_('builder_accent_in_variants')}</button>
      </div>
    {:else}
      <label class="easy__row">
        <input class="easy__color" type="color" value={draft.seeds.accent ?? base.accent} oninput={(e) => (draft.seeds.accent = e.currentTarget.value)}>
        <span class="easy__label">{$_('builder_accent')}</span>
        <code class="easy__code">{draft.seeds.accent ?? base.accent}</code>
      </label>
    {/if}

    <label class="easy__row">
      <input class="easy__color" type="color" value={draft.seeds.background ?? base.background} oninput={(e) => (draft.seeds.background = e.currentTarget.value)}>
      <span class="easy__label">{$_('builder_background')}</span>
      <code class="easy__code">{draft.seeds.background ?? base.background}</code>
    </label>

    <div class="easy__row">
      {#if textCustom}
        <input class="easy__color" type="color" aria-label={$_('builder_text')} value={draft.seeds.text} oninput={(e) => (draft.seeds.text = e.currentTarget.value)}>
      {:else}
        <span class="easy__swatch easy__swatch--text" aria-hidden="true">Aa</span>
      {/if}
      <span class="easy__label">{$_('builder_text')}</span>
      <div class="easy__segment easy__segment--small" role="group" aria-label={$_('builder_text')}>
        <button aria-pressed={!textCustom} onclick={() => (draft.seeds.text = null)}>{$_('builder_text_auto')}</button>
        <button aria-pressed={textCustom} onclick={() => (draft.seeds.text = '#1a1a1a')}>{$_('builder_text_custom')}</button>
      </div>
    </div>

    {#if contrast}
      <ul class="easy__contrast">
        <li><span>{$_('builder_contrast_body')}</span><span class="easy__ratio easy__ratio--{level(contrast.body, 4.5)}">{ratio(contrast.body)}</span></li>
        <li><span>{$_('builder_contrast_button')}</span><span class="easy__ratio easy__ratio--{level(contrast.button, 4.5)}">{ratio(contrast.button)}</span></li>
      </ul>
    {/if}
  </section>

  <section class="easy__section">
    <h2 class="easy__heading">{$_('builder_section_shape')}</h2>

    <div class="easy__field">
      <span id="builder-layout">{$_('builder_layout')}</span>
      <div class="easy__segment" role="group" aria-labelledby="builder-layout">
        {#each layouts as [value, label] (value)}
          <button aria-pressed={layout === value} onclick={() => (draft.seeds.layout = value)}>{$_(label)}</button>
        {/each}
      </div>
    </div>

    <label class="easy__field">
      <span class="easy__between"><span>{$_('builder_radius')}</span><span class="easy__code">{draft.seeds.radius ?? base.radius}px</span></span>
      <input type="range" min="0" max="24" step="1" value={draft.seeds.radius ?? base.radius} oninput={(e) => (draft.seeds.radius = Number(e.currentTarget.value))}>
    </label>

    <div class="easy__field">
      <span id="builder-shadow">{$_('builder_shadow')}</span>
      <div class="easy__segment" role="group" aria-labelledby="builder-shadow">
        {#each shadows as [value, label] (value)}
          <button aria-pressed={draft.seeds.shadow === value} onclick={() => (draft.seeds.shadow = value)}>{$_(label)}</button>
        {/each}
      </div>
    </div>

    <div class="easy__field">
      <span id="builder-surface">{$_('builder_surface')}</span>
      <div class="easy__segment" role="group" aria-labelledby="builder-surface">
        {#each surfaces as [value, label] (value)}
          <button aria-pressed={(draft.seeds.surface ?? 'solid') === value} onclick={() => (draft.seeds.surface = value)}>{$_(label)}</button>
        {/each}
      </div>
    </div>
  </section>

  <section class="easy__section">
    <h2 class="easy__heading">{$_('builder_section_image')}</h2>
    {#if backgroundUrl}
      <div class="easy__image">
        <img src={backgroundUrl} alt="">
        <button class="easy__link" onclick={removeImage}>{$_('builder_remove_image')}</button>
      </div>
    {:else}
      <label class="easy__drop">
        <ImageUp size={22} color="currentColor"></ImageUp>
        {$_('builder_choose_image')}
        <input class="easy__file" type="file" accept={IMAGE_TYPES.join(',')} onchange={chooseImage}>
      </label>
    {/if}
    {#if imageError}
      <p class="easy__error" role="alert">{imageError}</p>
    {/if}
  </section>
</div>

<style lang="postcss">
  .easy {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 16px;
  }

  .easy__section {
      display: flex;
      flex-direction: column;
      gap: 12px;
  }

  .easy__heading {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--builder-muted);
  }

  .easy__row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 40px;
  }

  .easy__label {
      flex-grow: 1;
  }

  .easy__color {
      width: 40px;
      height: 40px;
      padding: 2px;
      border: 1px solid #dfe2e6;
      border-radius: 10px;
      background: #fff;
      flex-shrink: 0;
  }

  .easy__swatch {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: 10px;
      border: 1px solid #dfe2e6;

      &--text {
          display: flex;
          align-items: center;
          justify-content: center;
          border-style: dashed;
          font-weight: 700;
      }
  }

  .easy__code {
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: var(--builder-muted);
  }

  .easy__link {
      color: var(--builder-text);
      text-decoration: underline;
      font-size: 13px;
  }

  .easy__contrast {
      list-style: none;
      margin: 0;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: #f6f7f8;
      border-radius: 10px;
      font-size: 13px;

      & li {
          display: flex;
          justify-content: space-between;
          gap: 8px;
      }
  }

  .easy__ratio {
      font-variant-numeric: tabular-nums;
      font-weight: 600;

      &--ok {
          color: #1b7f4b;
      }

      &--warn {
          color: #8a5a00;
      }

      &--bad {
          color: var(--builder-danger);
      }
  }

  .easy__field {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .easy__between {
      display: flex;
      justify-content: space-between;
  }

  .easy__segment {
      display: flex;
      gap: 2px;
      padding: 3px;
      background: var(--builder-field);
      border-radius: 9px;

      & button {
          flex: 1;
          padding: 7px 0;
          border-radius: 7px;
          font-size: 13px;
          color: var(--builder-text);
      }

      & button[aria-pressed='true'] {
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, .12);
      }

      &--small {
          flex-shrink: 0;
      }

      &--small button {
          padding: 6px 10px;
          white-space: nowrap;
      }
  }

  .easy__drop {
      position: relative;
      height: 88px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px dashed #c4c8ce;
      border-radius: 12px;
      background: #fafbfc;
      color: var(--builder-muted);
      cursor: pointer;

      &:focus-within {
          outline: 2px solid var(--builder-text);
      }
  }

  .easy__file {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
  }

  .easy__image {
      display: flex;
      align-items: center;
      gap: 12px;

      & img {
          width: 96px;
          height: 60px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid #dfe2e6;
      }
  }

  .easy__error {
      margin: 0;
      font-size: 12px;
      color: var(--builder-danger);
  }

  input[type='range'] {
      accent-color: var(--builder-text);
  }
</style>
