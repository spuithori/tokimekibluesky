<script lang="ts">
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import { X } from 'lucide-svelte';
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let image;

    function handleDelete() {
        dispatch('delete', {
            id: image.id,
        });
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

    <button class="image-upload-item__close" on:click={handleDelete}>
        <X color="#fff" size="16"></X>
    </button>

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
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, .6);
            display: grid;
            place-content: center;
            position: absolute;
            right: 8px;
            top: 8px;
        }
    }
</style>