<script lang="ts">
    import "../../timeline.css";
    import { onMount, tick, flushSync } from "svelte";
    import TimelineVideo from "$lib/components/post/TimelineVideo.svelte";

    let mounted = $state(false);
    const media = { aspectRatio: { width: 16, height: 9 }, playlist: '', thumbnail: '/blue.jpg' };

    function slotHeight(): number {
        const slot = document.querySelector('.harness-video');
        return slot ? Math.round((slot as HTMLElement).getBoundingClientRect().height) : 0;
    }

    onMount(() => {
        (window as any).__videoEmbedTest = {
            async mount() { mounted = true; await tick(); },
            async unmount() { mounted = false; await tick(); },
            mountPendingHeight() {
                mounted = true;
                flushSync();
                return slotHeight();
            },
            slotHeight,
        };
    });
</script>

<div class="harness-video" style="width: 400px;">
    {#if mounted}
        <TimelineVideo video={media}></TimelineVideo>
    {/if}
</div>
