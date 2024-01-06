<script lang="ts">
    import imageCompression from 'browser-image-compression';
    import {flip} from "svelte/animate";
    import { dndzone } from 'svelte-dnd-action';
    import ImageUploadItem from "$lib/components/editor/ImageUploadItem.svelte";
    import {settings} from "$lib/stores";
    import {
        acceptedImageType,
        getImageSize,
        resizeAspectRatioSize,
        transformImageFilter
    } from "$lib/components/editor/imageUploadUtil";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    type Image = {
        id: string,
        alt: string,
        file: File,
        base64: string | undefined,
        isGif: boolean,
    }

    export let images: Image[] = [];
    let input;

    $: {
        if (images.length > 4) {
            images = images.slice(0, 4);
        }
    }

    function handleDndConsider(e) {
        images = e.detail.items;
    }
    function handleDndFinalize(e) {
        images = e.detail.items;
    }

    async function handleInputChange(e) {
        dispatch('preparestart');
        const filesList = e.target.files || [];

        if (!filesList.length) {
            return false;
        }

        const files = Array.from(filesList).slice(0, 4);
        let promises = [];
        for (const file of files) {
            if (acceptedImageType.includes(file.type)) {
                promises = [...promises, applyImageFromFile(file)];
            }
        }

        await Promise.all(promises);

        input.value = '';
        dispatch('prepareend');
    }

    export async function applyImageFromFile(file, alt = '') {
        const compressed = await imageCompression(file, {
            maxWidthOrHeight: 1024,
            initialQuality: 0.8,
            useWebWorker: true,
        });

        const base64 = await imageCompression.getDataUrlFromFile(compressed);
        const isGif = await transformImageFilter(file);
        const {width, height} = resizeAspectRatioSize(await getImageSize(file));

        images = [...images, {
            id: self.crypto.randomUUID(),
            alt: alt,
            file: file,
            base64: base64,
            isGif: isGif,
            width: Math.floor(width),
            height: Math.floor(height),
        }];
    }

    export function open() {
        input.click();
    }

    function handleDelete(e) {
        images = images.filter(image => image.id !== e.detail.id);
    }
</script>

<div class="image-upload">
    <div class="image-upload-drag-area"
         class:image-upload-drag-area--1item={images.length === 1}
         class:image-upload-drag-area--bottom={$settings.design?.publishPosition === 'bottom'}
         use:dndzone="{{items: images, flipDurationMs: 300, type: 'images', dropTargetStyle: ''}}"
         on:consider="{handleDndConsider}"
         on:finalize="{handleDndFinalize}"
    >
        {#each images as image (image.id)}
            <div animate:flip="{{duration: 300}}">
                <ImageUploadItem {image} on:delete={handleDelete}></ImageUploadItem>
            </div>
        {/each}
    </div>
</div>

<input class="image-upload-input" type="file" accept="image/png, image/jpeg, image/gif" multiple on:change={handleInputChange} bind:this={input}>

<style lang="postcss">
    .image-upload-drag-area {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;

        &--1item {
            grid-template-columns: 1fr;

            @media (max-width: 767px) {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        &--bottom {
            grid-template-columns: repeat(4, 1fr);

            @media (max-width: 767px) {
                grid-template-columns: repeat(2, 1fr);
            }
        }
    }

    .image-upload-input {
        appearance: none;
        display: none;
    }
</style>