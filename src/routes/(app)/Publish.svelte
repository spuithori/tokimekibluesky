<script lang="ts">
  import { settings } from '$lib/stores';
  import {goto, pushState} from '$app/navigation';
  import {page} from '$app/stores';
  import {tick} from "svelte";
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import {publishState} from "$lib/classes/publishState.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {findPublishColumn, removePublishColumn} from "$lib/publishColumn";
  import PublishForm from "$lib/components/publish/PublishForm.svelte";
  import PublishFab from "$lib/components/publish/PublishFab.svelte";

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

<PublishFab open={isMobile ? publishState.show && isMobilePopState : publishState.show} onOpen={handleOpen} {onClose}></PublishFab>

<section class="publish-group publish-group--popup"
         class:publish-group--expanded={isMobile ? publishState.show && isMobilePopState : publishState.show}
         class:vk-publish-group={!$settings.design?.mobilePostLayoutTop}
         class:publish-mobile-top={$settings?.design?.mobilePostLayoutTop}
>
  <div class="publish-bg-close" onclick={onClose} aria-hidden="true"></div>

  <PublishForm bind:this={formEl} variant="overlay" onRequestClose={onClose} onRequestOpen={handleOpen}></PublishForm>
</section>

<style lang="postcss">
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
