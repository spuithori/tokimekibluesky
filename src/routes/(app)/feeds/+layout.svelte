<script lang="ts">
  import { ensureFeedBuilderLocale } from '$lib/feedbuilder/i18n';

  let { children } = $props();

  const ready = ensureFeedBuilderLocale();
</script>

<div class="settings-modal">
  <div class="settings-modal-content tfeeds-modal">
    <div class="tfeeds">
      {#await ready then}
        {@render children?.()}
      {/await}
    </div>
  </div>

  <a class="modal-background-close" aria-hidden="true" tabindex="-1" href="/"></a>
</div>

<style lang="postcss">
  .tfeeds-modal {
      background: var(--bg-color-1);

      &:has(:global(.feeds-page--builder)) {
          width: 1360px;
          max-width: calc(100vw - 32px);
          height: min(920px, calc(100dvh - 64px));

          @media (max-width: 767px) {
              max-width: 100vw;
              height: 100dvh;
          }
      }
  }

  .tfeeds {
      --ink: var(--text-color-1);
      --primary-color-hover: color-mix(in srgb, var(--primary-color) 86%, #000);
      --primary-color-soft: color-mix(in srgb, var(--primary-color) 12%, transparent);
      --on-primary: var(--on-accent, var(--bg-color-1));
      --accent-color: var(--primary-color);
      --warning-color: #b7791f;
      --cyan-color: var(--primary-color);
      --cyan-color-soft: color-mix(in srgb, var(--primary-color) 14%, transparent);
      --color-primary-500: var(--primary-color);
      --color-primary-600: var(--primary-color-hover);
      --color-red: var(--danger-color);
      --color-pink-soft: var(--bg-color-3);
      --color-mint-soft: var(--bg-color-3);
      --color-peri-soft: var(--bg-color-3);
      --color-sky-soft: var(--bg-color-3);
      --color-cream-soft: var(--bg-color-3);

      --base-bg-color: var(--bg-color-1);
      --surface-hover: var(--bg-color-2);
      --surface-active: var(--bg-color-3);
      --surface-1: var(--bg-color-1);
      --hairline: var(--border-color-2);
      --hairline-faint: var(--border-color-2);
      --text-color-inverse: var(--bg-color-1);

      --radius-1: var(--border-radius-2);
      --radius-2: var(--border-radius-3);
      --radius-3: var(--border-radius-3);
      --radius-4: var(--border-radius-4);
      --radius-5: var(--border-radius-4);
      --radius-pill: 999px;

      --space-1: 4px;
      --space-2: 8px;
      --space-3: 12px;
      --space-4: 16px;
      --space-5: 20px;
      --space-6: 24px;
      --space-8: 32px;
      --space-10: 40px;
      --space-12: 48px;

      --line-strong: 1px solid var(--border-color-1);
      --ink-shadow: var(--border-color-1);
      --shadow-1: none;
      --shadow-2: none;
      --shadow-3: var(--elevation-2, 0 4px 12px rgba(0, 0, 0, .12));
      --shadow-pop: var(--elevation-3, 0 8px 24px rgba(0, 0, 0, .14));

      --chart-accent: var(--primary-color);
      --chart-wash: color-mix(in srgb, var(--primary-color) 10%, transparent);
      --chart-grid: var(--border-color-2);
      --status-good: #0ca30c;
      --status-warning: #fab219;
      --status-critical: #d03b3b;
      --status-none: var(--bg-color-3);

      --duration-fast: 140ms;
      --duration-mid: 200ms;
      --duration-slow: 280ms;
      --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

      --z-sticky: 10;
      --z-modal: 50;
      --app-bar-height: 0px;
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);

      height: 100%;
      min-height: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
      color: var(--text-color-1);
      scrollbar-width: thin;
      scrollbar-color: var(--scroll-bar-color) transparent;
  }

  @keyframes -global-rise-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: none; }
  }

  @keyframes -global-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
  }

  @keyframes -global-sheen {
      from { background-position: -200px 0; }
      to { background-position: 400px 0; }
  }

  @media (prefers-reduced-motion: reduce) {
      .tfeeds :global(*),
      .tfeeds :global(*::before),
      .tfeeds :global(*::after) {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          animation-delay: 0ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0ms !important;
      }
  }
</style>
