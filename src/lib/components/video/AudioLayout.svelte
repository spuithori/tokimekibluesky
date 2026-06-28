<script lang="ts">
    import { getContext } from "svelte";
    import { Pause, Play, RotateCcw, Volume1, Volume2, VolumeX } from "lucide-svelte";

    const player: any = getContext('player');

    let seekEl: HTMLDivElement | undefined = $state();
    let volEl: HTMLDivElement | undefined = $state();
    let seekDragging = $state(false);
    let seeking = $state(false);
    let seekPreview = $state(0);
    let volDragging = $state(false);
    let seekRect: DOMRect | null = null;
    let volRect: DOMRect | null = null;
    let rafId: number | null = null;
    let pendingSeekTime = 0;

    function formatTime(seconds: number): string {
        if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    let progress = $derived(
        player.duration === 0
            ? 0
            : (seekDragging || seeking)
                ? seekPreview
                : (player.currentTime / player.duration) * 100
    );
    let volumeLevel = $derived(player.muted ? 0 : player.volume);

    $effect(() => {
        if (seeking && player.duration > 0 && Math.abs(player.currentTime - pendingSeekTime) < 0.5) {
            seeking = false;
        }
    });

    function seekDown(e: PointerEvent) {
        if (!seekEl) return;
        seekDragging = true;
        seekEl.setPointerCapture(e.pointerId);
        seekRect = seekEl.getBoundingClientRect();
        updateSeekPreview(e);
    }
    function seekMove(e: PointerEvent) {
        if (!seekDragging || rafId !== null) return;
        rafId = requestAnimationFrame(() => { updateSeekPreview(e); rafId = null; });
    }
    function seekUp(e: PointerEvent) {
        if (!seekEl || !seekDragging) return;
        seekDragging = false;
        seekEl.releasePointerCapture(e.pointerId);
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }

        updateSeekPreview(e);
        seekRect = null;

        if (player.duration > 0) {
            seeking = true;
            player.seek(pendingSeekTime);
        }
    }
    function updateSeekPreview(e: PointerEvent) {
        if (!seekEl || player.duration === 0) return;
        const rect = seekRect || seekEl.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        pendingSeekTime = pct * player.duration;
        seekPreview = pct * 100;
    }

    function volDown(e: PointerEvent) {
        if (!volEl) return;
        volDragging = true;
        volEl.setPointerCapture(e.pointerId);
        volRect = volEl.getBoundingClientRect();
        volTo(e);
    }
    function volMove(e: PointerEvent) {
        if (!volDragging) return;
        volTo(e);
    }
    function volUp(e: PointerEvent) {
        if (!volEl) return;
        volDragging = false;
        volEl.releasePointerCapture(e.pointerId);
        volRect = null;
    }
    function volTo(e: PointerEvent) {
        if (!volEl) return;
        const rect = volRect || volEl.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        player.setVolume(pct);
    }
</script>

<div class="audio-player">
    <div class="audio-player__meta">
        <span class="audio-player__title">{player.title || 'Audio'}</span>
        {#if player.artist}
            <span class="audio-player__artist">{player.artist}</span>
        {/if}
    </div>

    <div class="audio-player__controls">
        <button
            class="audio-player__play"
            onclick={() => player.togglePlay()}
            aria-label={player.paused ? 'Play' : 'Pause'}
        >
            {#if player.ended}
                <RotateCcw size="18" color="#fff"></RotateCcw>
            {:else if player.paused}
                <Play size="18" color="#fff" fill="#fff"></Play>
            {:else}
                <Pause size="18" color="#fff" fill="#fff"></Pause>
            {/if}
        </button>

        <div
            bind:this={seekEl}
            class="audio-player__slider audio-player__seek"
            onpointerdown={seekDown}
            onpointermove={seekMove}
            onpointerup={seekUp}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={player.duration}
            aria-valuenow={player.currentTime}
            tabindex="0"
            style="--fill: {progress}%"
        >
            <div class="audio-player__slider-fill"></div>
            <div class="audio-player__slider-thumb"></div>
        </div>

        <span class="audio-player__time">{formatTime(player.currentTime)} / {formatTime(player.duration)}</span>

        <button
            class="audio-player__mute"
            onclick={() => player.toggleMute()}
            aria-label={player.muted ? 'Unmute' : 'Mute'}
        >
            {#if player.muted || player.volume === 0}
                <VolumeX size="17" color="currentColor"></VolumeX>
            {:else if player.volume < 0.5}
                <Volume1 size="17" color="currentColor"></Volume1>
            {:else}
                <Volume2 size="17" color="currentColor"></Volume2>
            {/if}
        </button>

        <div
            bind:this={volEl}
            class="audio-player__slider audio-player__volume"
            onpointerdown={volDown}
            onpointermove={volMove}
            onpointerup={volUp}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={volumeLevel}
            tabindex="0"
            style="--fill: {volumeLevel * 100}%"
        >
            <div class="audio-player__slider-fill"></div>
            <div class="audio-player__slider-thumb"></div>
        </div>
    </div>
</div>

<style lang="postcss">
    .audio-player {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 9px;
        padding: 0 16px;
        background-color: var(--bg-color-2);
        color: var(--text-color-1);
    }

    .audio-player__meta {
        display: flex;
        align-items: baseline;
        gap: 7px;
        min-width: 0;
    }

    .audio-player__title {
        font-size: 13px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 1;
    }

    .audio-player__artist {
        font-size: 12px;
        color: var(--text-color-3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 2;
    }

    .audio-player__controls {
        display: flex;
        align-items: center;
        gap: 9px;
    }

    .audio-player__play,
    .audio-player__mute {
        flex-shrink: 0;
        background-color: transparent;
        border: none;
        cursor: pointer;
        display: grid;
        place-content: center;
        padding: 0;
    }

    .audio-player__play {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background-color: var(--primary-color, #1d9bf0);
    }

    .audio-player__mute {
        width: 22px;
        height: 22px;
        color: var(--text-color-1);
    }

    .audio-player__slider {
        position: relative;
        height: 4px;
        border-radius: 2px;
        background-color: var(--border-color-2);
        cursor: pointer;
        touch-action: none;

        &::after {
            content: '';
            position: absolute;
            inset: -8px 0;
        }
    }

    .audio-player__seek {
        flex: 1;
        min-width: 30px;
    }

    .audio-player__volume {
        flex-shrink: 0;
        width: 52px;
    }

    .audio-player__slider-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--fill, 0%);
        background-color: var(--primary-color, #1d9bf0);
        border-radius: 2px;
    }

    .audio-player__slider-thumb {
        position: absolute;
        top: 50%;
        left: var(--fill, 0%);
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background-color: var(--primary-color);
        box-shadow: 0 0 3px var(--box-shadow-color-1);
        transform: translate(-50%, -50%);
    }

    .audio-player__time {
        flex-shrink: 0;
        font-size: 11px;
        font-weight: 500;
        color: var(--text-color-3);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
    }
</style>
