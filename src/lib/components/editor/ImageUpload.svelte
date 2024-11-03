<script lang="ts">
    import {_} from 'svelte-i18n'
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
    import EmbedVideo from "$lib/components/post/EmbedVideo.svelte";
    import {X} from "lucide-svelte";
    import {toast} from "svelte-sonner";
    const dispatch = createEventDispatcher();

    type Image = {
        id: string,
        alt: string,
        file: File,
        base64: string | undefined,
        isGif: boolean,
    }

    interface Props {
        images?: Image[];
        video: any;
    }

    let { images = $bindable([]), video = $bindable() }: Props = $props();
    let input = $state();

    $effect(() => {
        if (images.length > 4) {
            images = images.slice(0, 4);
        }
    })

    function handleDndConsider(e) {
        images = e.detail.items;
    }
    function handleDndFinalize(e) {
        images = e.detail.items;
    }

    async function getVideoDimensions(file) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = function() {
                window.URL.revokeObjectURL(video.src);
                resolve({
                    width: this.videoWidth,
                    height: this.videoHeight,
                    duration: this.duration,
                });
            };

            video.onerror = function() {
                reject('Error Get Video Dimensions');
            };

            video.src = window.URL.createObjectURL(file);
        });
    }

    async function handleInputChange(e) {
        dispatch('preparestart');
        const filesList = e.target.files || [];

        if (!filesList.length) {
            return false;
        }

        if (filesList[0].type === 'video/mp4') {
            const videoFile = filesList[0];
            const dimensions = await getVideoDimensions(videoFile);

            if (videoFile.size / 1024 / 1024 > 50 || dimensions.duration > 60) {
                toast.error($_('error_video_too_large'));
                return false;
            }

            const videoDataUrl = await imageCompression.getDataUrlFromFile(videoFile);
            const videoBytes = await fetch(videoDataUrl).then(res => res.arrayBuffer());

            video = {
                aspectRatio: {
                    width: dimensions.width,
                    height: dimensions.height,
                },
                blob: videoFile,
                bytes: videoBytes,
                mimeType: videoFile.type,
                ext: videoFile.type.split('/')[1],
            }

            input.value = '';
            dispatch('prepareend');
            return false;
        }

        const files = Array.from(filesList).slice(0, 4);
        let promises = [];
        for (const file of files) {
            if (acceptedImageType.includes(file.type)) {
                promises = [...promises, applyImageFromFile(file)];
            }
        }

        images = [...images, ...await Promise.all(promises)];
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

        return {
            id: self.crypto.randomUUID(),
            alt: alt,
            file: file,
            base64: base64,
            isGif: isGif,
            width: Math.floor(width),
            height: Math.floor(height),
        }
    }

    export function open(isVideo: boolean) {
        if (isVideo) {
            images = [];
            input.setAttribute('accept', 'video/mp4, video/quicktime, video/webm');
            input.removeAttribute('multiple');
        } else {
            video = undefined;
            input.setAttribute('accept', 'image/png, image/jpeg, image/gif, image/webp');
            input.setAttribute('multiple', '')
        }

        input.click();
    }

    function handleDelete(e) {
        images = images.filter(image => image.id !== e.detail.id);
    }

    function handleVideoDelete() {
        video = undefined;
    }
</script>

<div class="image-upload">
    <div class="image-upload-drag-area"
         class:image-upload-drag-area--1item={images.length === 1}
         class:image-upload-drag-area--bottom={$settings.design?.publishPosition === 'bottom'}
         use:dndzone="{{items: images, flipDurationMs: 300, type: 'images', dropTargetStyle: ''}}"
         onconsider={handleDndConsider}
         onfinalize={handleDndFinalize}
    >
        {#each images as image (image.id)}
            <div animate:flip="{{duration: 300}}">
                <ImageUploadItem {image} on:delete={handleDelete}></ImageUploadItem>
            </div>
        {/each}
    </div>
</div>

<input class="image-upload-input" type="file" onchange={handleInputChange} bind:this={input}>

{#if video}
    <div class="video-upload-item">
        <EmbedVideo video={video} isLocal={true}></EmbedVideo>

        <button class="video-upload-item__close" onclick={handleVideoDelete}>
            <X color="#fff" size="18"></X>
        </button>
    </div>
{/if}

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

    .video-upload-item {
        position: relative;

        &__close {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, .7);
            display: grid;
            place-content: center;
            position: absolute;
            right: 8px;
            top: 8px;
        }
    }
</style>