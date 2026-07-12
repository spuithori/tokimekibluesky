<script lang="ts">
    import ImageLoader from '$lib/components/utils/ImageLoader.svelte';

    let src = $state('');
    let mounted = $state(false);
    let wrapEl = $state<HTMLElement>();

    if (typeof window !== 'undefined') {
        (window as any).__imageLoaderTest = {
            setSrc(u: string) {
                src = u;
            },
            preload(u: string) {
                return new Promise<void>((resolve) => {
                    const img = new Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = u;
                });
            },
            mount() {
                mounted = true;
            },
            unmount() {
                mounted = false;
            },
            getState() {
                const img = wrapEl?.querySelector('img');
                if (!img) return null;
                const cs = getComputedStyle(img);
                return {
                    hasSrc: !!img.getAttribute('src'),
                    naturalWidth: img.naturalWidth,
                    complete: img.complete,
                    loaded: img.classList.contains('loaded'),
                    instant: img.classList.contains('lazy-image--instant'),
                    opacity: cs.opacity,
                    transitionDuration: cs.transitionDuration,
                };
            },
        };
    }
</script>

<div class="image-loader-harness" bind:this={wrapEl}>
    {#if mounted}
        {#key src}
            <ImageLoader
                image={{ thumb: src, alt: '', aspectRatio: { width: 100, height: 100 } }}
                naturalWidth={() => {}}
                naturalHeight={() => {}}
            ></ImageLoader>
        {/key}
    {/if}
</div>
