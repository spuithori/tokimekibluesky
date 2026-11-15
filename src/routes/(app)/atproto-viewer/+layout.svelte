<script lang="ts">
  import { ensureExplorerLocale } from '$lib/explorer/i18n';

  let { children } = $props();

  const ready = ensureExplorerLocale();
</script>

<div class="settings-modal">
  <div class="settings-modal-content explorer-modal">
    {#await ready then}
      {@render children?.()}
    {/await}
  </div>

  <a class="modal-background-close" aria-hidden="true" tabindex="-1" href="/"></a>
</div>

<style lang="postcss">
  .explorer-modal {
      width: 1360px;
      max-width: calc(100vw - 32px);
      height: min(920px, calc(100dvh - 64px));
      background: var(--bg-color-1);

      @media (max-width: 767px) {
          max-width: 100vw;
          height: 100dvh;
          border: none;
          border-radius: 0;
      }
  }

  :global {
      .explorer {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          height: 100%;
          min-height: 0;
          color: var(--text-color-1);
          container: explorer / inline-size;
      }

      .explorer-panes {
          display: grid;
          grid-template-columns: 272px 360px minmax(0, 1fr);
          height: 100%;
          min-height: 0;
      }

      .explorer-pane {
          min-width: 0;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: var(--scroll-bar-color) transparent;

          &--side {
              border-right: 1px solid var(--border-color-2);
              background-color: var(--bg-color-2);
          }

          &--list {
              border-right: 1px solid var(--border-color-2);
              overflow: hidden;
          }

          &--detail,
          &--main {
              container-type: inline-size;
          }

          &--main {
              grid-column: 2 / -1;
          }

          &__padded {
              padding: 20px 24px 40px;
              max-width: 920px;

              &--fill {
                  height: 100%;
                  padding-bottom: 20px;
              }

              @container explorer (max-width: 719px) {
                  padding: 16px 16px 32px;
              }
          }

          &__title {
              font-size: 18px;
              margin-bottom: 20px;
          }
      }

      @container explorer (max-width: 1099px) {
          .explorer-panes {
              grid-template-columns: 260px minmax(0, 1fr);

              &[data-split='records'] {
                  grid-template-columns: 320px minmax(0, 1fr);

                  .explorer-pane--side {
                      display: none;
                  }
              }
          }

          .explorer-pane--main {
              grid-column: 2;
          }
      }

      @container explorer (max-width: 719px) {
          .explorer-panes,
          .explorer-panes[data-split='records'] {
              grid-template-columns: minmax(0, 1fr);
              grid-template-rows: minmax(0, 1fr);

              .explorer-pane {
                  display: block;
                  grid-area: 1 / 1;
                  border-right: none;
                  visibility: hidden;
              }

              .explorer-pane--side {
                  background-color: transparent;
              }

              &[data-pane='side'] .explorer-pane--side,
              &[data-pane='main'] .explorer-pane--main,
              &[data-pane='list'] .explorer-pane--list,
              &[data-pane='detail'] .explorer-pane--detail {
                  visibility: visible;
              }
          }
      }

      .explorer-page {
          overflow-y: auto;
          overscroll-behavior: contain;
          min-height: 0;
          container-type: inline-size;
      }

      .explorer-icon-button {
          flex: none;
          display: grid;
          place-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-control, 6px);
          color: var(--text-color-3);

          @media (max-width: 767px) {
              width: 40px;
              height: 40px;
          }

          @media (hover: hover) {
              &:hover:not(:disabled) {
                  background-color: var(--state-hover, var(--bg-color-3));
                  color: var(--text-color-1);
              }
          }

          &:disabled {
              opacity: .4;
          }

          &--on {
              color: var(--primary-color);
              background-color: color-mix(in oklab, var(--primary-color) 12%, transparent);
          }

          &--danger {
              @media (hover: hover) {
                  &:hover:not(:disabled) {
                      color: var(--danger-color);
                  }
              }
          }
      }

      .explorer-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 30px;
          padding: 0 12px;
          border: 1px solid var(--border-color-1);
          border-radius: var(--radius-round, 999px);
          font-size: 12px;
          color: var(--text-color-1);
          white-space: nowrap;

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      .explorer-filter {
          flex: 1;
          min-width: 0;
          height: 32px;
          padding: 0 10px;
          border: 1px solid var(--border-color-1);
          border-radius: var(--radius-control, 6px);
          background-color: var(--bg-color-1);
          color: var(--text-color-1);
          font-size: 13px;
          outline: none;

          &:focus-visible {
              border-color: var(--primary-color);
          }

          &::placeholder {
              color: var(--text-color-3);
          }

          @media (max-width: 767px) {
              height: 40px;
              font-size: 16px;
          }
      }

      .explorer-empty {
          padding: 24px 16px;
          text-align: center;
          font-size: 13px;
          color: var(--text-color-3);
      }

      .explorer-section-title {
          margin-bottom: 10px;
          font-size: 12px;
          letter-spacing: .04em;
          color: var(--text-color-3);
      }

      .explorer-tabs {
          display: flex;
          gap: 4px;
          padding: 0 16px;
          border-bottom: 1px solid var(--border-color-2);
          overflow-x: auto;
          scrollbar-width: none;

          &__tab {
              position: relative;
              flex: none;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              height: 40px;
              padding: 0 10px;
              font-size: 13px;
              color: var(--text-color-3);

              &--active {
                  color: var(--text-color-1);
                  font-weight: 600;

                  &::after {
                      content: '';
                      position: absolute;
                      left: 10px;
                      right: 10px;
                      bottom: -1px;
                      height: 2px;
                      border-radius: 2px 2px 0 0;
                      background-color: var(--primary-color);
                  }
              }
          }

          &__badge {
              min-width: 18px;
              padding: 0 5px;
              border-radius: var(--radius-round, 999px);
              font-size: 11px;
              line-height: 18px;
              text-align: center;
              color: var(--on-danger, #fff);
              background-color: var(--danger-color);
          }
      }

      .explorer-facts {
          display: grid;
          gap: 0;
          font-size: 13px;

          > div {
              display: grid;
              grid-template-columns: 132px minmax(0, 1fr);
              gap: 12px;
              padding: 9px 0;
              border-bottom: 1px solid var(--border-color-2);

              @container (max-width: 520px) {
                  grid-template-columns: minmax(0, 1fr);
                  gap: 2px;
              }
          }

          dt {
              font-size: 12px;
              color: var(--text-color-3);
              line-height: 1.7;
          }

          dd {
              min-width: 0;
              line-height: 1.6;
              overflow-wrap: anywhere;
          }

          &__mono {
              font-family: var(--code-font);
              font-size: 12px;
          }

          &__link {
              color: var(--link-color, var(--primary-color));
          }
      }

      .explorer-message {
          display: grid;
          justify-items: center;
          gap: 8px;
          padding: 64px 24px;
          text-align: center;

          &__title {
              font-size: 15px;
              font-weight: 600;
          }

          &__sub {
              font-family: var(--code-font);
              font-size: 12px;
              color: var(--text-color-3);
              overflow-wrap: anywhere;
          }

          &__actions {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 8px;
              margin-top: 8px;
          }
      }
  }
</style>
