<script lang="ts">
    import { getContext } from "svelte";

    const player: any = getContext('player');

    function formatTime(seconds: number): string {
        if (isNaN(seconds) || seconds === 0) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    let remainingTime = $derived(player.duration - player.currentTime);
    let displayTime = $derived(formatTime(remainingTime));
</script>

<div class="video-time">
    <span class="video-time__item">-{displayTime}</span>
</div>

<style lang="postcss">
    .video-time {
        color: #fff;
        font-size: 13px;
        white-space: nowrap;
        letter-spacing: .025em;
        position: absolute;
        left: 8px;
        bottom: 52px;
        padding: 2px 4px;
        font-weight: 500;
        background-color: rgba(0, 0, 0, .5);
        border-radius: var(--border-radius-2);
    }
</style>