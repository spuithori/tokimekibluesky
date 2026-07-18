<script lang="ts">
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    import ImageAlt from "$lib/components/utils/ImageAlt.svelte";
    import {getService} from "$lib/util";
    import {observeVisible} from "$lib/lazyObserver";

    let url = $state('');
    interface Props {
        did: any;
        blob: any;
        alt?: string;
        aspectRatio?: { width?: number; height?: number };
    }

    let { did, blob, alt = '', aspectRatio }: Props = $props();

    async function resolveBlobUrl(): Promise<string> {
        try {
            const service = await getService(did);
            const cid = blob.ref?.$link ?? blob.ref?.toString();
            return `${service}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did as string)}&cid=${encodeURIComponent(cid)}`;
        } catch (e) {
            console.error(e)
        }

        return '';
    }

    function lazyResolve(node: HTMLElement) {
        let cancelled = false;
        const target = node.closest('.virtual-item') ?? node;
        const unobserve = observeVisible(target, () => {
            resolveBlobUrl().then((u) => {
                if (!cancelled) {
                    url = u;
                }
            });
        });

        return {
            destroy() {
                cancelled = true;
                unobserve();
            },
        };
    }
</script>

<div class="gif-image" use:lazyResolve style={aspectRatio?.width && aspectRatio?.height ? `--gif-width: ${aspectRatio.width}; --gif-height: ${aspectRatio.height}` : ''}>
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