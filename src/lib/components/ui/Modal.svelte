<script lang="ts">
  import { X } from 'lucide-svelte';
  import { scale } from 'svelte/transition';

  let { title, size = 'normal', onclose, children } = $props();
  const duration = 150;
  let el = $state();

  function open() {
    el.showModal();
  }

  $effect.pre(() => {
    if (el) {
      open();
    }
  });

  function handleClick (event) {
    const rect = el.getBoundingClientRect();
    const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

    if (!isInDialog) {
      onclose();
    }
  }
</script>

<dialog
  class="v2-modal v2-modal--{size}"
  bind:this={el}
  in:scale={{duration: 250, opacity: 0, start: 0.98}}
  onclick={handleClick}
  {onclose}
>
  <div class="v2-modal__inner">
    <div class="modal-heading">
      <h2 class="modal-title modal-title--smaller">{title}</h2>

      <button class="modal-close-button" onclick={onclose} aria-label="Close">
        <X color="var(--text-color-1)"></X>
      </button>
    </div>

    <div class="v2-modal-contents">
      {@render children?.()}
    </div>
  </div>
</dialog>

<style lang="postcss">
  .v2-modal {
      --modal-transition-scale: scale(1);
      --modal-transition-opacity: 1;

      will-change: transform, opacity;
      opacity: var(--modal-transition-opacity);
      margin: auto;
      overflow: hidden;
      border: none;
      border-radius: var(--border-radius-5);
      background-color: var(--bg-color-1);
      color: var(--text-color-1);
      transform: var(--modal-transition-scale);
      cursor: pointer;

      &::backdrop {
          background-color: rgba(0, 0, 0, .6);
          opacity: var(--modal-transition-opacity);
      }

      @media (min-width: 768px) {
          scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);

          &::-webkit-scrollbar {
              width: 6px;
          }

          &::-webkit-scrollbar-thumb {
              background: var(--scroll-bar-color);
              border-radius: 0;
          }

          &::-webkit-scrollbar-track {
              background: var(--scroll-bar-bg-color);
              border-radius: 0;
          }
      }

      @media (max-width: 767px) {
          display: block;
          overscroll-behavior-y: none;
      }

      &__inner {
          cursor: initial;
          overflow-y: auto;
          max-height: 90dvh;
      }

      &--normal {
          max-width: min(740px, 94vw);
          width: 100%;
      }

      &--small {
          width: 500px;
          max-width: 94vw;
      }

      &--fixed {
          width: 500px;
          height: 600px;
          max-width: 94vw;
          max-height: 90vh;

          .v2-modal__inner {
              height: 100%;
          }
      }
  }

  .v2-modal-contents {
      padding: 24px 36px;

      @media (max-width: 767px) {
         padding: 24px 16px;
      }
  }

  .modal-heading {
      background-color: var(--bg-color-1);
      z-index: 21;
      border-bottom: 1px solid var(--border-color-1);
      position: sticky;
      top: 0;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 0 64px;
  }

  .modal-title {
      margin-bottom: 0;
      font-size: 18px;
      letter-spacing: .025em;

      @media (max-width: 767px) {
          font-size: 16px;
      }
  }

  .modal-close-button {
      position: absolute;
      height: 64px;
      width: 64px;
      top: 0;
      right: 0;
      display: grid;
      place-content: center;
  }
</style>
