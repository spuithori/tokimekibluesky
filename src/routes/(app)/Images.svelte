<script>
    import GLightbox from 'glightbox';
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

    function open(index) {
        gl.openAt(index);
    }
</script>

<div class="timeline-images">
  {#each images as image, index}
    <div class="timeline-image">
      <button on:click={() => open(index)} aria-label="画像を拡大する">
        <img src="{image.thumb}" alt="">
      </button>
    </div>
  {/each}
</div>

<style lang="postcss">
    .timeline-images {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;

        &:has(.timeline-image:only-child) {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    .timeline-image {
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        border-radius: 6px;
        display: flex;

        &:only-child {
            aspect-ratio: auto;
        }
    }

    .timeline-image button {
        width: 100%;
        height: 100%;
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
            gap: 5px;
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>