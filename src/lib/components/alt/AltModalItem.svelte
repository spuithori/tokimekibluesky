<script lang="ts">
    import Sparkles from '@lucide/svelte/icons/sparkles';
  import { compressImage } from '$lib/imageCompressor/compressor';
  import {tick} from "svelte";
  import {_} from 'svelte-i18n';
  import { toast } from "svelte-sonner";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {settings} from "$lib/stores";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import { PUBLIC_DETECT_ALT_API_SERVER, PUBLIC_DETECT_ALT_API_HEADER } from '$env/static/public';

  let { image = $bindable(), altFocusPulse } = $props();
  let isProcessing = $state(false);
  let isMenuOpen = $state(false);
  let isUsed = $state(false);

  async function getAltTextFromAi(category: 'ocr' | 'description') {
      if (isProcessing || isUsed) {
          return;
      }
      isMenuOpen = false;
      const blob = new Blob([image.file], {type: image.file.type});
      const compressedFile = await compressImage(blob, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1280,
      });
      const formData = new FormData();
      formData.append('image', compressedFile);
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

  function focusing(el) {
    if (altFocusPulse && altFocusPulse === image.id) {
      tick().then(() => {
        el.focus();
        el.scrollIntoView(false);
      })
    }
  }
</script>

<div class="alt-modal-item">
  <div class="alt-modal-item__image">
    <img src="{image.base64}" alt="">

    {#if !isUsed}
      <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="ai-button-wrap" position={'top'}>
        {#snippet ref()}
                <span class="ai-button" >
              <Sparkles size={18} />AI
            {#if isProcessing}
              <LoadingSpinner size="16" padding="0" color="#fff"></LoadingSpinner>
            {/if}
          </span>
              {/snippet}

        {#snippet content()}
                <ul  class="timeline-menu-list">
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={() => getAltTextFromAi('ocr')} disabled={isProcessing}>{$_('ai_alt_ocr')}</button>
            </li>

            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" onclick={() => getAltTextFromAi('description')} disabled={isProcessing}>{$_('ai_alt_description')}</button>
            </li>
          </ul>
              {/snippet}
      </Menu>
    {/if}
  </div>

  <div class="alt-modal-item__content">
    <div class="alt-modal-item__text">
      <textarea class="alt-modal-textarea" bind:value={image.alt} disabled={isProcessing} use:focusing placeholder="alt text..."></textarea>
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

        &::placeholder {
            color: var(--text-color-3);
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