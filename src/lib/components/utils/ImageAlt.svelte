<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import Modal from "$lib/components/ui/Modal.svelte";
  import {languageDetect} from '$lib/translate';
  import {settings} from "$lib/stores";
  import {Languages} from "lucide-svelte";

  let { pswp, images, index } = $props();
  let isModalOpen = $state(false);
  let isTranslated = $state(false);
  let translatedText = $state('');

  async function translation(text, lang = window.navigator.language) {
    try {
      const res = await fetch(`/api/translator`, {
        method: 'post',
        body: JSON.stringify({
          text: text,
          to: lang,
        })
      });
      const translation = await res.json();
      translatedText = await translation[0].translations[0].text;
      isTranslated = true;
    } catch (e) {
      console.error(e);
    }
  }

  function handleClose() {
    isModalOpen = false;
    translatedText = '';
    isTranslated = false;
  }
</script>

{#if (images[index]?.alt)}
  <div class="image-alt">
    <p class="image-alt-text" onclick={() => {isModalOpen = true}}>{images[index].alt}</p>
  </div>
{/if}

{#if (isModalOpen)}
  <Modal title="ALT" onclose={handleClose}>
    {#await languageDetect(images[index].alt)}
    {:then langs}
      {#if (!langs.includes($settings?.general?.language))}
        <button class="image-alt-translate-button" disabled={isTranslated} onclick={() => translation(images[index].alt, $settings?.general?.userLanguage)}>
          <Languages size="16" color="var(--primary-color)"></Languages>
          {m[isTranslated ? 'already_translated' : 'translation']()}
        </button>
      {/if}
    {:catch error}
        <p>Translate error (´；ω；`)</p>
    {/await}

    {#if (translatedText)}
      <p class="image-alt-translated-text">
        {translatedText}
      </p>
    {/if}

    <p class="image-alt-modal-text">
      {images[index].alt}
    </p>
  </Modal>
{/if}

<style lang="postcss">
  .image-alt {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px;
      color: #fff;
      font-size: 14px;
      background-color: rgba(0, 0, 0, .5);
      line-height: 1.5;
  }

  .image-alt-text {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      cursor: pointer;
  }

  .image-alt-modal-text {
      white-space: pre-wrap;
      color: var(--text-color-1);
  }

  .image-alt-translated-text {
    border: 1px solid var(--border-color-2);
    border-radius: var(--border-color-2);
    background-color: var(--bg-color-2);
    padding: 8px;
    margin: 16px 0;
    white-space: pre-wrap;
  }

  .image-alt-translate-button {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--primary-color);
    margin-bottom: 16px;

    &:hover {
      text-decoration: underline;
    }
  }
</style>