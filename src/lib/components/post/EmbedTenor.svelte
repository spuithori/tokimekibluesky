<script lang="ts">
  import {settings} from "$lib/stores";

  let { tenor } = $props();
  let paused = $state();

  if ($settings?.general?.disableTenorAutoplay) {
      paused = true;
  }
</script>

<div class="gif-video-wrap">
  {#if tenor.mp4Url}
    {#if paused}
      <div class="gif-pause-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="21" height="24" viewBox="0 0 21 24">
          <path id="多角形_1" data-name="多角形 1" d="M10.264,3.039a2,2,0,0,1,3.473,0L22.29,18.008A2,2,0,0,1,20.554,21H3.446A2,2,0,0,1,1.71,18.008Z" transform="translate(21) rotate(90)" fill="#fff"/>
        </svg>
      </div>
    {/if}

    <video class="gif-video"
           src={tenor.mp4Url}
           bind:paused
           autoplay={!$settings?.general?.disableTenorAutoplay}
           muted
           playsinline
           loop
    ></video>

    <button class="gif-toggle" onclick={() => paused = !paused}></button>
  {:else}
    <img src={tenor.url} width={tenor.width} height={tenor.height} alt="">
  {/if}
</div>

<style lang="postcss">
  .gif-video-wrap {
      position: relative;
  }

  .gif-video {
      display: block;
      width: 100%;
      aspect-ratio: auto;
  }

  .gif-toggle {
      position: absolute;
      inset: 0;
      z-index: 1;
  }

  .gif-pause-icon {
      pointer-events: none;
      position: absolute;
      inset: 0;
      width: 50px;
      height: 50px;
      margin: auto;
      background-color: transparent;
      border-radius: 50%;
      display: grid;
      place-content: center;
      aspect-ratio: 1 / 1;
      z-index: 2;

      &::before {
          content: '';
          display: block;
          position: absolute;
          width: 100%;
          height: 100%;
          inset: 0;
          border-radius: 50%;
          background-color: var(--primary-color);
          opacity: .8;
          z-index: -1;
      }

      svg {
          margin-left: 5px;
      }
  }
</style>
