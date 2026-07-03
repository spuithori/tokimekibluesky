<script lang="ts">
    import { onMount, tick } from "svelte";
    import ImageLoader from "$lib/components/utils/ImageLoader.svelte";

    let src = $state('/blue.jpg');
    let mounted = $state(false);

    function getImg(): HTMLImageElement | null {
        return document.querySelector('.harness-image .lazy-image');
    }

    onMount(() => {
        (window as any).__imageLoaderTest = {
            setSrc(url: string) { src = url; },
            preload(url: string) {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = url;
                });
            },
            async mount() { mounted = true; await tick(); },
            async unmount() { mounted = false; await tick(); },
            getState() {
                const img = getImg();
                if (!img) return null;
                const cs = getComputedStyle(img);
                return {
                    opacity: cs.opacity,
                    transitionDuration: cs.transitionDuration,
                    instant: img.classList.contains('lazy-image--instant'),
                    loaded: img.classList.contains('loaded'),
                    complete: img.complete,
                    naturalWidth: img.naturalWidth,
                    hasSrc: !!img.getAttribute('src'),
                };
            },
        };
    });
</script>

<div style="padding: 20px;">
    {#if mounted}
        <div class="harness-image" style="width: 200px; height: 200px;">
            <ImageLoader
                image={{ thumb: src, alt: 'test', aspectRatio: { width: 200, height: 200 } }}
                naturalWidth={() => {}}
                naturalHeight={() => {}}
            ></ImageLoader>
        </div>
    {/if}
</div>
