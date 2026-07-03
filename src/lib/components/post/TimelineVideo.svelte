<script lang="ts">
    let { video, isTok = false } = $props();

    const width = $derived(video?.aspectRatio?.width || 16);
    const height = $derived(video?.aspectRatio?.height || 9);
</script>

{#await import('$lib/components/post/EmbedVideo.svelte')}
    <div class="timeline-video-wrap" class:timeline-video-wrap--tok={isTok} style="--video-width: {width}; --video-height: {height}"></div>
{:then { default: EmbedVideo }}
    <EmbedVideo {video} {isTok}></EmbedVideo>
{/await}
