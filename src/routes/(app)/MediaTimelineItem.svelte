<script lang="ts">
    import { fade } from 'svelte/transition';
    import { agent } from '$lib/stores';
    import { AppBskyFeedDefs } from '@atproto/api';
    import MediaTimelineItemModal from './MediaTimelineItemModal.svelte';
    import { goto } from '$app/navigation';

    export let data;
    let isOpen = false;

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    function modalToggle() {
        isOpen = isOpen !== true;
        document.body.classList.toggle('scroll-lock', isOpen);

        if (isOpen) {
            goto('#open');
        }
    }

    function handleClose() {
        isOpen = false;
    }
</script>

<div class="media-item" class:media-item--repost={isReasonRepost(data.reason)}
     class:media-item--reply={data.reply && data.reply.parent.author.did !== $agent.did()}>
  <button on:click={modalToggle} aria-label="画像を拡大する">
    <img src="{data.post.embed.images[0].thumb}" alt="" loading="lazy">

    {#if (data.post.embed.images.length > 1)}
      <div class="media-item__count">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
          <g id="グループ_88" data-name="グループ 88" transform="translate(-77 -224)">
            <rect id="長方形_73" data-name="長方形 73" width="11" height="11" rx="1" transform="translate(80 224)" fill="#fff"/>
            <rect id="長方形_74" data-name="長方形 74" width="2" height="11" rx="1" transform="translate(77 227)" fill="#fff"/>
            <rect id="長方形_75" data-name="長方形 75" width="2" height="11" rx="1" transform="translate(77 238) rotate(-90)" fill="#fff"/>
          </g>
        </svg>
        {data.post.embed.images.length}</div>
    {/if}

    {#if (isReasonRepost(data.reason))}
      <div class="media-item__is-repost">
        <svg xmlns="http://www.w3.org/2000/svg" width="65.627" height="40.176" viewBox="0 0 65.627 40.176">
          <path id="retweet" d="M42.418,43.116a1.089,1.089,0,0,1-1.06,1.06H9.544c-1.226,0-1.06-1.292-1.06-2.121V22.967H2.121A2.135,2.135,0,0,1,0,20.846a2.028,2.028,0,0,1,.5-1.36L11.1,6.761a2.174,2.174,0,0,1,3.249,0l10.6,12.725a2.025,2.025,0,0,1,.5,1.36,2.135,2.135,0,0,1-2.121,2.121H16.967V35.693H36.055a1.134,1.134,0,0,1,.829.365l5.3,6.363A1.335,1.335,0,0,1,42.418,43.116ZM63.627,29.33a2.028,2.028,0,0,1-.5,1.36l-10.6,12.725a2.114,2.114,0,0,1-3.249,0l-10.6-12.725a2.025,2.025,0,0,1-.5-1.36A2.135,2.135,0,0,1,40.3,27.209H46.66V14.484H27.572a1.057,1.057,0,0,1-.829-.4l-5.3-6.363a1.136,1.136,0,0,1-.231-.664A1.089,1.089,0,0,1,22.269,6H54.083c1.226,0,1.06,1.292,1.06,2.121V27.209h6.363A2.135,2.135,0,0,1,63.627,29.33Z" transform="translate(1 -5)" fill="#ffffff" stroke="var(--primary-color)" stroke-width="2"/>
        </svg>
      </div>
    {/if}
  </button>
</div>

{#if (isOpen)}
  <div class="media-content-wrap" transition:fade="{{ duration: 300 }}">
    <MediaTimelineItemModal data={data} on:close={handleClose}></MediaTimelineItemModal>
  </div>
{/if}

<style lang="postcss">
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

      &__count {
          color: #fff;
          background-color: rgba(0, 0, 0, .5);
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 13px;
          width: 40px;
          height: 24px;
          border-radius: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;

          svg {
              transform: scale(.8);
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

  .media-content-wrap {
      position: fixed;
      left: 0;
      top: 0;
      bottom: 0;
      right: 0;
      height: 100vh;
      z-index: 1000;
      background-color: rgba(0, 0, 0, .8);
      display: grid;
      place-content: center;
      padding: 0 40px;

      @media (max-width: 767px) {
          padding: 10px;
      }
  }
</style>