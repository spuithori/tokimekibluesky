<script lang="ts">
    import {onMount, onDestroy} from "svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import ImageAlt from "$lib/components/utils/ImageAlt.svelte";
    import {getService} from "$lib/util";

    let url = $state('');
    interface Props {
        did: any;
        blob: any;
        alt?: string;
        aspectRatio?: { width?: number; height?: number };
    }

    let { did, blob, alt = '', aspectRatio }: Props = $props();

    async function getUrlByBlob(blob) {
        try {
            const service = await getService(did);
            const cid = blob.ref?.$link ?? blob.ref?.toString();
            const res = await fetch(`${service}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did as string)}&cid=${encodeURIComponent(cid)}`);
            const data = new Blob([await res.arrayBuffer()], {type: 'image/gif'});

            return URL.createObjectURL(data);
        } catch (e) {
            console.error(e)
        }

        return '';
    }

    onMount(async () => {
        url = await getUrlByBlob(blob);
    })

    onDestroy(() => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    })
</script>

<div class="gif-image" style={aspectRatio?.width && aspectRatio?.height ? `--gif-width: ${aspectRatio.width}; --gif-height: ${aspectRatio.height}` : ''}>
    {#if (url)}
        <img src={url} alt={alt} width={aspectRatio?.width} height={aspectRatio?.height}>
    {:else}
        <div class="gif-image-loading">
            <LoadingSpinner color="var(--text-color-1)" size="32" padding="0"></LoadingSpinner>
        </div>
    {/if}
    <div class="image-labels">
        <span class="gif-label">GIF</span>
        {#if alt}
            <ImageAlt {alt} badge></ImageAlt>
        {/if}
    </div>
</div>

<style lang="postcss">
    .gif-image {
        position: relative;
        width: 100%;
        height: 100%;

        img {
            width: 100%;
            height: 100%;
        }
    }

    .gif-image-loading {
        width: 100%;
        height: 100%;
        display: grid;
        place-content: center;
        background-color: var(--bg-color-2);
    }
</style>