<script lang="ts">
  import { once } from 'svelte/legacy';

  import {_} from 'svelte-i18n';
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {settings} from "$lib/stores";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import { PUBLIC_DETECT_ALT_API_SERVER, PUBLIC_DETECT_ALT_API_HEADER } from '$env/static/public';

  let { image = $bindable() } = $props();
  let isProcessing = $state(false);
  let isMenuOpen = $state(false);
  let isUsed = $state(false);

  async function getAltTextFromAi(category: 'ocr' | 'description') {
      isMenuOpen = false;
      const blob = new Blob([image.file], {type: image.file.type});
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('category', category);
      formData.append('language', $settings.general.userLanguage);

      isProcessing = true;
      try {
          const res = await fetch(PUBLIC_DETECT_ALT_API_SERVER, {
              method: 'POST',
              headers: {
                  'X-PF-HEADER': PUBLIC_DETECT_ALT_API_HEADER,
              },
              body: formData,
          });
          const data = await res.json();

          image.alt = data.text;
      } catch (e) {
          console.log(e);
          toast.error('Sorry, Error!!');
      }

      isProcessing = false;
      isUsed = true;
  }
</script>

<div class="alt-modal-item">
  <div class="alt-modal-item__image">
    <img src="{image.base64}" alt="">

    {#if !isUsed}
      <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="ai-button-wrap" position={'top'}>
        {#snippet ref()}
                <span class="ai-button" >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>AI
            {#if isProcessing}
              <LoadingSpinner size="16" padding="0" color="#fff"></LoadingSpinner>
            {/if}
          </span>
              {/snippet}

        {#snippet content()}
                <ul  class="timeline-menu-list">
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={once(() => {getAltTextFromAi('ocr')})} disabled={isProcessing}>{$_('ai_alt_ocr')}</button>
            </li>

            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={once(() => {getAltTextFromAi('description')})} disabled={isProcessing}>{$_('ai_alt_description')}</button>
            </li>
          </ul>
              {/snippet}
      </Menu>
    {/if}
  </div>

  <div class="alt-modal-item__content">
    <div class="alt-modal-item__text">
      <textarea class="alt-modal-textarea" bind:value={image.alt} disabled={isProcessing} placeholder="alt text..."></textarea>
    </div>
  </div>
</div>

<style lang="postcss">
    .alt-modal-textarea {
        background-color: var(--bg-color-2);
        width: 100%;
        height: 100%;
        padding: 10px;
        color: var(--text-color-1);
        overscroll-behavior: none;

        @media (max-width: 767px) {
            font-size: 14px;
        }
    }

    .alt-modal-item {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 15px;
        margin-bottom: 20px;

        @media (max-width: 767px) {
            grid-template-columns: 1fr;

            &:not(:last-child) {
                border-bottom: 1px solid var(--border-color-2);
                padding-bottom: 20px;
            }
        }

        &__image {
            width: 100%;
            aspect-ratio: 1 / 1;
            position: relative;
            background-color: var(--bg-color-2);

            @media (max-width: 767px) {
                aspect-ratio: 16 / 9;
            }

            img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                border-radius: 6px;
            }
        }

        &__text {
            height: 100%;
            min-height: 120px;
        }
    }
</style>