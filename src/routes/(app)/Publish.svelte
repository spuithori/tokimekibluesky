<script lang="ts">
  import { settings } from '$lib/stores';
  import {goto, pushState} from '$app/navigation';
  import {page} from '$app/stores';
  import {tick} from "svelte";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {findPublishColumn, removePublishColumn} from "$lib/publishColumn";
  import Pencil from '@lucide/svelte/icons/pencil';
  import X from '@lucide/svelte/icons/x';
  import PublishForm from "$lib/components/publish/PublishForm.svelte";

  const columnState = getColumnState();
  let formEl = $state<{ focusEditor: (position?: any) => void; blurEditor: () => void }>();

  const isMobile = navigator?.userAgentData?.mobile || false;
  let isMobilePopState = $derived(isMobile ? $page.state.showPublish : false);

  $effect(() => {
      if (publishState.show) {
          tick().then(() => {
              formEl?.focusEditor();
          });
      }
  })

  function handleOpen() {
      if (!publishState.show) {
          publishState.show = true;

          if (!publishState.show) {
              return;
          }
      }

      tick().then(() => { formEl?.focusEditor(); });

      if (isMobile) {
          tick().then(() => {
            pushState('', {
              showPublish: true
            });
          });
      }

      scrollDirectionState.direction = 'up';
  }

  function onClose() {
      if (publishState.show) {
          publishState.show = false;
          formEl?.blurEditor();

          if (isMobile && $page.state.showPublish) {
              history.back();
          }
      }
  }

  function handleKeydown(event: { key: string; }) {
      const activeElement = document.activeElement?.tagName;

      if (event.key === 'n' && !(activeElement === 'TEXTAREA' || activeElement === 'INPUT' || document.activeElement.classList.contains('tiptap'))) {
          handleOpen();
      }

      if (event.key === '/' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
          goto('/search');
      }

      if (event.key === 'Escape') {
          if (publishState.show) {
              onClose();
          } else if (findPublishColumn(columnState.columns)) {
              removePublishColumn(columnState);
          }
      }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if (isMobile ? publishState.show && isMobilePopState : publishState.show)}
  <button class="publish-toggle publish-toggle--close" aria-label="Close post composer." class:publish-toggle--vk={!$settings.design?.mobilePostLayoutTop} class:publish-toggle--mobileV2={$settings.design?.mobileNewUi} onclick={onClose}>
    <X size="24" color="var(--bg-color-1)"></X>
  </button>
{:else}
  <button class="publish-toggle" aria-label="Open post composer." class:publish-toggle--decks={$settings.design?.layout === 'decks'} class:publish-toggle--mobileV2={$settings.design?.mobileNewUi} onclick={handleOpen}>
    <Pencil size="22" color="var(--bg-color-1)"></Pencil>
  </button>
{/if}

<section class="publish-group publish-group--popup"
         class:publish-group--expanded={isMobile ? publishState.show && isMobilePopState : publishState.show}
         class:vk-publish-group={!$settings.design?.mobilePostLayoutTop}
         class:publish-mobile-top={$settings?.design?.mobilePostLayoutTop}
>
  <div class="publish-bg-close" onclick={onClose} aria-hidden="true"></div>

  <PublishForm bind:this={formEl} variant="overlay" onRequestClose={onClose} onRequestOpen={handleOpen}></PublishForm>
</section>

<style lang="postcss">
    .publish-toggle {
        display: flex;
        position: fixed;
        right: 16px;
        bottom: calc(16px + var(--safe-area-bottom));
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background-color: var(--primary-color);
        align-items: center;
        justify-content: center;
        z-index: 2001;
        pointer-events: auto;

        @media (max-width: 767px) {
            display: flex;
            bottom: calc(64px + var(--safe-area-bottom));
        }

        &--vk {
            @media (max-width: 767px) {
                display: none;
            }
        }

        &--hidden {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
            }
        }

        &--mobileV2 {
            @media (max-width: 767px) {
                width: 48px;
                height: 48px;
                bottom: calc(112px + var(--visual-viewport-height, 0px) + var(--safe-area-bottom));
            }
        }

        &--decks {
            @media (min-width: 768px) {
                display: none;
            }
        }
    }

    .publish-bg-close {
        position: fixed;
        inset: 0;
        cursor: pointer;
        z-index: -1;

        @media (max-width: 767px) {
            display: none;
        }
    }
</style>
