<script lang="ts">
    import { fade } from 'svelte/transition';

    let { image, naturalWidth, naturalHeight } = $props();
    const img = new Image();
    img.src = image.thumb;
</script>

{#if img.complete}
    <img
        loading="lazy"
        src={image.thumb}
        alt={image.alt}
        width={image?.aspectRatio?.width}
        height={image?.aspectRatio?.height}
        bind:naturalWidth={null, (v) => naturalWidth(image?.aspectRatio?.width || v)}
        bind:naturalHeight={null, (v) => naturalHeight(image?.aspectRatio?.height || v)}
    >
{:else}
    {#await img.decode()}
        <div class="image-loading"></div>
    {:then value}
        <img
            in:fade={{ duration: 200 }}
            src={image.thumb}
            alt={image.alt}
            width={image?.aspectRatio?.width}
            height={image?.aspectRatio?.height}
            bind:naturalWidth={null, (v) => naturalWidth(image?.aspectRatio?.width || v)}
            bind:naturalHeight={null, (v) => naturalHeight(image?.aspectRatio?.height || v)}
        >
    {/await}
{/if}

<style lang="postcss">
    .image-loading {
        width: 100%;
        height: 100%;
        background-color: var(--border-color-2);
    }
</style>