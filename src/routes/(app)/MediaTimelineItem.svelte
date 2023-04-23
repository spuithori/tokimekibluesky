<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import TimelineItem from "./TimelineItem.svelte";

    export let item;
    let isOpen = false;

    function modalToggle() {
        isOpen = isOpen !== true;
    }
</script>

<div>
  <div class="media-item">
    <button on:click={modalToggle} aria-label="画像を拡大する">
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

  {#if (isOpen)}
    <div class="media-content-wrap" transition:fade="{{ duration: 300 }}">
      <button on:click={modalToggle} class="media-content-close gclose gbtn" aria-label="Close" data-taborder="3"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" xml:space="preserve"><g><g><path d="M505.943,6.058c-8.077-8.077-21.172-8.077-29.249,0L6.058,476.693c-8.077,8.077-8.077,21.172,0,29.249C10.096,509.982,15.39,512,20.683,512c5.293,0,10.586-2.019,14.625-6.059L505.943,35.306C514.019,27.23,514.019,14.135,505.943,6.058z"></path></g></g><g><g><path d="M505.942,476.694L35.306,6.059c-8.076-8.077-21.172-8.077-29.248,0c-8.077,8.076-8.077,21.171,0,29.248l470.636,470.636c4.038,4.039,9.332,6.058,14.625,6.058c5.293,0,10.587-2.019,14.624-6.057C514.018,497.866,514.018,484.771,505.942,476.694z"></path></g></g></svg></button>

      <div class="media-content" transition:scale="{{duration: 350, opacity: 0.5, start: 0.8}}">
        <div class="media-content__image">
          <img src="{item.fullsize}" alt="">
        </div>

        <div class="media-content__content">
          <TimelineItem data={item.feed} isMedia={true}></TimelineItem>
        </div>
      </div>
    </div>
  {/if}
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

  .media-content-close {
      position: fixed;
      right: 20px;
      top: 15px;
      z-index: 50;
      background-color: rgba(0, 0, 0, .32);
      opacity: .7;
      width: 35px;
      height: 35px;

      svg {
          width: 18px;
          height: auto;
          display: block;
          fill: #fff;
      }
  }

  .media-content {
      display: grid;
      grid-template-columns: 2fr 1fr;
      background-color: #fff;
      padding: 40px;
      gap: 40px;
      border-radius: 10px;
      overflow: auto;
      overscroll-behavior: contain;

      @media (max-width: 767px) {
          display: block;
          padding: 10px;
          border-radius: 4px;
      }

      &__image {
          height: 100%;

          @media (max-width: 767px) {
              height: auto;
          }
      }

      &__content {

      }

      img {
          width: 100%;
          height: max-content;
          max-height: 80vh;
          object-fit: contain;

          @media (max-width: 767px) {
              height: auto;
          }
      }
  }
</style>