<script lang="ts">
    import { _ } from 'svelte-i18n'
    import { agent } from '$lib/stores';
    import { timeline, cursor, notificationCount, quotePost } from '$lib/stores';
    import { afterUpdate, onMount } from 'svelte';
    import Images from "./Images.svelte";
    import { fade, fly } from 'svelte/transition';
    import { AppBskyEmbedExternal, AppBskyEmbedRecord, AppBskyEmbedImages, AppBskyFeedPost, AppBskyFeedDefs, RichText, RichTextSegment, AppBskyEmbedRecordWithMedia, AppBskyFeedGetLikes } from '@atproto/api'
    import toast from "svelte-french-toast";
    // @ts-ignore
    import GLightbox from 'glightbox';

    export let item;

    let galleryImage = {
        'href': item.fullsize,
        'type': 'image',
    };

    const gl = GLightbox({
        elements: [galleryImage]
    })

    function open(index?: any) {
        gl.open();
    }
</script>

<div class="media-item">
  <div class="media-item">
    <a href="{item.pageUrl}" class="media-item__post" title="投稿を見る">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="#ffffff"/>
      </svg>
    </a>

    <button on:click={() => open()} aria-label="画像を拡大する">
      <img src="{item.thumb}" alt="" loading="lazy">

      {#if (item.isRepost)}
        <div class="media-item__is-repost">
          <svg xmlns="http://www.w3.org/2000/svg" width="65.627" height="40.176" viewBox="0 0 65.627 40.176">
            <path id="retweet" d="M42.418,43.116a1.089,1.089,0,0,1-1.06,1.06H9.544c-1.226,0-1.06-1.292-1.06-2.121V22.967H2.121A2.135,2.135,0,0,1,0,20.846a2.028,2.028,0,0,1,.5-1.36L11.1,6.761a2.174,2.174,0,0,1,3.249,0l10.6,12.725a2.025,2.025,0,0,1,.5,1.36,2.135,2.135,0,0,1-2.121,2.121H16.967V35.693H36.055a1.134,1.134,0,0,1,.829.365l5.3,6.363A1.335,1.335,0,0,1,42.418,43.116ZM63.627,29.33a2.028,2.028,0,0,1-.5,1.36l-10.6,12.725a2.114,2.114,0,0,1-3.249,0l-10.6-12.725a2.025,2.025,0,0,1-.5-1.36A2.135,2.135,0,0,1,40.3,27.209H46.66V14.484H27.572a1.057,1.057,0,0,1-.829-.4l-5.3-6.363a1.136,1.136,0,0,1-.231-.664A1.089,1.089,0,0,1,22.269,6H54.083c1.226,0,1.06,1.292,1.06,2.121V27.209h6.363A2.135,2.135,0,0,1,63.627,29.33Z" transform="translate(1 -5)" fill="#ffffff" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>
        </div>
      {/if}
    </button>
  </div>
</div>

<style lang="postcss">
  .media-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;

      @media (max-width: 767px) {
          grid-template-columns: repeat(2, 1fr);
      }
  }

  .media-item {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      position: relative;

      button {
          width: 100%;
          height: 100%;
          position: relative;
      }

      img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .2s ease-in-out;

          &:hover {
              transform: scale(1.1);
          }
      }

      &__post {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, .6);
          display: grid;
          place-content: center;
          z-index: 30;
          padding: 5px;

          @media (max-width: 767px) {
              width: 28px;
              height: 28px;
              padding: 8px;
          }

          svg {
              width: 100%;
              height: auto;
          }
      }

      &__is-repost {
          position: absolute;
          right: 20px;
          bottom: 20px;
          filter: drop-shadow(0 0 6px rgba(0, 0, 0, .12));

          @media (max-width: 767px) {
              right: 10px;
              bottom: 10px;

              svg {
                  width: 60px;
                  height: auto;
              }
          }
      }
  }
</style>