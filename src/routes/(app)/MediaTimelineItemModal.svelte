<script lang="ts">
    import { scale } from 'svelte/transition';
    import TimelineItem from "./TimelineItem.svelte";
    import { Splide, SplideSlide } from '@splidejs/svelte-splide';
    import '@splidejs/svelte-splide/css';
    import { createEventDispatcher } from 'svelte';
    import { beforeNavigate } from "$app/navigation";
    import {agent} from "$lib/stores";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let data;
    function modalClose() {
        history.back();
        dispatch('close');
    }

    function handlePopstate(e) {
        document.body.classList.remove('scroll-lock');
        dispatch('close');
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            modalClose();
        }
    }

    beforeNavigate(async () => {
        document.body.classList.remove('scroll-lock');
    })
</script>

<svelte:window on:popstate={handlePopstate} on:keydown={handleKeydown}></svelte:window>

<button on:click={modalClose} class="media-content-close gclose gbtn" aria-label="Close" data-taborder="3"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" xml:space="preserve"><g><g><path d="M505.943,6.058c-8.077-8.077-21.172-8.077-29.249,0L6.058,476.693c-8.077,8.077-8.077,21.172,0,29.249C10.096,509.982,15.39,512,20.683,512c5.293,0,10.586-2.019,14.625-6.059L505.943,35.306C514.019,27.23,514.019,14.135,505.943,6.058z"></path></g></g><g><g><path d="M505.942,476.694L35.306,6.059c-8.076-8.077-21.172-8.077-29.248,0c-8.077,8.076-8.077,21.171,0,29.248l470.636,470.636c4.038,4.039,9.332,6.058,14.625,6.058c5.293,0,10.587-2.019,14.624-6.057C514.018,497.866,514.018,484.771,505.942,476.694z"></path></g></g></svg></button>
<button on:click={modalClose} class="media-content-close-bg"></button>

<div class="media-content" transition:scale="{{duration: 350, opacity: 0.5, start: 0.8}}">
  <div class="media-content__image">

    {#if (data.post.embed.images.length > 1)}

      <Splide options={ {
              gap   : '20px',
          } }>
        {#each data.post.embed.images as image}
          <SplideSlide>
            <img src="{image.fullsize}" alt="" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
          </SplideSlide>
        {/each}
      </Splide>
    {:else}
      {#each data.post.embed.images as image}
        <img src="{image.fullsize}" alt="" width={image?.aspectRatio?.width} height={image?.aspectRatio?.height}>
      {/each}
    {/if}
  </div>

  <div class="media-content__content">
    <TimelineItem data={data} isMedia={true} {_agent}></TimelineItem>
  </div>
</div>

<style lang="postcss">
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

    .media-content-close-bg {
        position: absolute;
        left: 0;
        bottom: 0;
        top: 0;
        right: 0;
    }

    .media-content {
        display: grid;
        grid-template-columns: auto 320px;
        background-color: var(--bg-color-1);
        padding: 40px;
        gap: 40px;
        border-radius: 10px;
        overflow: auto;
        overscroll-behavior: contain;
        position: relative;

        @media (max-width: 959px) {
            display: block;
            padding: 10px;
            border-radius: 4px;
        }

        &__image {
            height: 100%;

            @media (max-width: 959px) {
                height: auto;
            }
        }

        &__content {

        }

        img {
            width: 100%;
            height: 100%;
            max-height: 80vh;
            object-fit: contain;

            @media (max-width: 959px) {
                height: auto;
            }
        }
    }
</style>