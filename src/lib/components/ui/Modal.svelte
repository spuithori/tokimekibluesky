<script lang="ts">
    import { X } from 'lucide-svelte';
    import {createEventDispatcher, onDestroy, onMount} from 'svelte';
    import { pushState } from '$app/navigation';
    import { page } from '$app/stores';
    import { sineOut } from 'svelte/easing';
    const dispatch = createEventDispatcher();

    export let title;
    export let size = 'normal';
    const duration = 150;
    let el;

    function close() {
        dispatch('close');
    }

    function open() {
        el.showModal();
    }

    function back () {
        history.back();
    }

    function modalTransition(node: HTMLElement, params) {
        const sd = 1 - 0.95;

        return {
            delay: params.delay || 0,
            duration: params.duration || duration,
            easing: params.easing || sineOut,
            css: (t, u) => `
              --modal-transition-scale: scale(${1 - sd * u});
              --modal-transition-opacity: ${t};
            `
        };
    }

    onMount(() => {
        pushState('', {
            ...$page.state,
            showModal: true
        });
    })

    onDestroy(() => {
        if ($page.state.showModal) {
            history.back();
        }
    })

    $: if (el) {
        open();
    }
</script>

{#if $page.state.showModal}
  <dialog
          class="v2-modal v2-modal--{size}"
          bind:this={el}
          on:click|stopPropagation={back}
          on:cancel|preventDefault={back}
          on:outroend={close}
          transition:modalTransition
  >
    <div class="v2-modal__inner" on:click|stopPropagation>
      <div class="modal-heading">
        <h2 class="modal-title modal-title--smaller">{title}</h2>

        <button class="modal-close-button" on:click={back} aria-label="Close">
          <X color="var(--text-color-1)"></X>
        </button>
      </div>

      <div class="v2-modal-contents">
        <slot></slot>
      </div>
    </div>
  </dialog>
{/if}

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
          scrollbar-color: var(--primary-color) var(--bg-color-3);

          &::-webkit-scrollbar {
              width: 10px;
          }

          &::-webkit-scrollbar-thumb {
              background: var(--primary-color);
              border-radius: 5px;
          }

          &::-webkit-scrollbar-track {
              background: var(--bg-color-3);
              border-radius: 5px;
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
      z-index: 1;
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
