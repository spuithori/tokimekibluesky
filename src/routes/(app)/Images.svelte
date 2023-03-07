<script>
    import GLightbox from 'glightbox';
    import {onMount} from "svelte";
    export let images;

    let galleryImages = [];

    for (const image of images) {
        galleryImages.push({
            'href': image.fullsize,
            'type': 'image',
        })
    }

    const gl = GLightbox({
        elements: galleryImages
    })

    onMount(async () => {

        console.log(gl)
        console.log(galleryImages)
    });

    function open(index) {
        gl.openAt(index);
    }
</script>

<div class="timeline-images">
  {#each images as image, index}
    <div class="timeline-image">
      <button on:click={() => open(index)}>
        <img src="{image.thumb}" alt="">
      </button>
    </div>
  {/each}
</div>

<style>
    .timeline-images {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
    }

    .timeline-image {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border-radius: 10px;
        display: flex;
    }

    .timeline-image:hover img {
        transform: scale(1.1);
    }

    .timeline-images img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform .2s ease-in-out;
    }

    @media (max-width: 767px) {
        .timeline-images {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>