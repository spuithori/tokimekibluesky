<script lang="ts">
    import { observeVisible } from "$lib/lazyObserver";

    let { image, naturalWidth, naturalHeight } = $props();
    let loaded = $state(false);
    let instant = $state(false);
    let inView = $state(false);

    function lazyLoad(node: HTMLImageElement) {
        const target = node.closest('.virtual-item') ?? node;
        const unobserve = observeVisible(target, () => {
            inView = true;
        });
        return {
            destroy() {
                unobserve();
                node.src = '';
            },
        };
    }

    function detectCached(node: HTMLImageElement) {
        if (inView && !loaded && node.complete && node.naturalWidth > 0) {
            instant = true;
            loaded = true;
        }
    }
</script>

<img
    use:lazyLoad
    {@attach detectCached}
    decoding="async"
    src={inView ? image.thumb : undefined}
    alt={image.alt}
    width={image?.aspectRatio?.width}
    height={image?.aspectRatio?.height}
    class="lazy-image"
    class:loaded
    class:lazy-image--instant={instant}
    onload={() => { loaded = true; }}
    bind:naturalWidth={null, (v) => naturalWidth(image?.aspectRatio?.width || v)}
    bind:naturalHeight={null, (v) => naturalHeight(image?.aspectRatio?.height || v)}
>

<style lang="postcss">
    .lazy-image {
        background-color: var(--border-color-2);
        opacity: 0;
        transition: opacity 200ms;
    }
    .lazy-image.loaded {
        opacity: 1;
    }

    .lazy-image--instant {
        transition: none;
    }
</style>
