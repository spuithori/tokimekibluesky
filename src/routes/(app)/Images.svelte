<script lang="ts">
    // @ts-ignore
    import GLightbox from 'glightbox';
    export let images: any[];

    let galleryImages = [];

    for (const image of images) {
        galleryImages.push({
            'href': image.fullsize,
            'type': 'image',
            'description': image.alt ? 'ALT: ' + image.alt : '',
        })
    }

    const gl = GLightbox({
        elements: galleryImages
    })

    function open(index: any) {
        gl.openAt(index);
    }
</script>

<div class="timeline-images">
  {#each images as image, index}
    <div class="timeline-image">
      <button on:click={() => open(index)} aria-label="画像を拡大する">
        <img src="{image.thumb}" alt="{image.alt}" loading="lazy">
      </button>
    </div>
  {/each}
</div>

<style lang="postcss">
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
</style>