<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { createEventDispatcher } from 'svelte';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    const dispatch = createEventDispatcher();

    export let images;

    function close() {
        dispatch('close', {
            images: images,
        });
    }
</script>

<div class="alt-modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="alt-modal-contents">
    <h2 class="alt-modal-title">{$_('alt_insert')}</h2>

    <div class="alt-modal-list">
      {#each images as image}
        <div class="alt-modal-list__item">
          <div class="alt-modal-list__image">
            <img src="{window.URL.createObjectURL(image.image)}" alt="">
          </div>

          <div class="alt-modal-list__content">
            <div class="alt-modal-list__text">
              <textarea class="alt-modal-textarea" bind:value={image.alt}></textarea>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="alt-modal-close">
      <button class="button button--sm" on:click={close}>{$_('close_button')}</button>
    </div>
  </div>
</div>

<style lang="postcss">
    .alt-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .alt-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .alt-modal-close {
        text-align: center;
        margin-top: 30px;
    }

    .alt-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 10px;
    }

    .alt-modal-list {
        &__item {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 15px;
            margin-bottom: 20px;

            @media (max-width: 767px) {
                grid-template-columns: 75px 1fr;
                gap: 10px;
            }
        }

        &__image {
            width: 100%;
            aspect-ratio: 1 / 1;

            img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 6px;
            }
        }

        &__text {
            height: 100%;
            min-height: 120px;
        }
    }

    .alt-modal-textarea {
        background-color: var(--bg-color-2);
        width: 100%;
        height: 100%;
        padding: 10px;
        color: var(--text-color-1);

        @media (max-width: 767px) {
            font-size: 14px;
        }
    }
</style>