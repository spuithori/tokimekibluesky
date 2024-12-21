<script lang="ts">
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { X } from 'lucide-svelte';

    let { image, ondelete, onaltclick } = $props();

    function handleDelete() {
        ondelete(image.id);
    }
</script>

<div class="image-upload-item">
    {#if (image.base64)}
        <img src="{image.base64}" alt="">
    {:else}
        <div class="image-upload-item__loading">
            <LoadingSpinner padding="0" size="24"></LoadingSpinner>
        </div>
    {/if}

    <button class="image-upload-item__close" onclick={handleDelete}>
        <X color="#fff" size="20"></X>
    </button>

    <button class="image-upload-item__alt" onclick={() => {onaltclick(image.id)}}>ALT</button>

    {#if (image.isGif)}
        <span class="gif-label">GIF</span>
    {/if}
</div>

<style lang="postcss">
    .image-upload-item {
        border-radius: var(--border-radius-3);
        width: 100%;
        height: 100%;
        aspect-ratio: 1 / 1;
        background-color: var(--bg-color-3);
        overflow: hidden;
        position: relative;

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            image-rendering: crisp-edges;
        }

        &__loading {
            width: 100%;
            height: 100%;
            display: grid;
            place-content: center;
        }

        &__close {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, .7);
            display: grid;
            place-content: center;
            position: absolute;
            right: 8px;
            top: 8px;
        }

        &__alt {
            width: 48px;
            height: 32px;
            border-radius: 24px;
            background-color: rgba(0, 0, 0, .7);
            display: grid;
            place-content: center;
            position: absolute;
            left: 8px;
            top: 8px;
            color: #fff;
            font-weight: bold;
            letter-spacing: .05em;
            font-size: 14px;
        }
    }
</style>