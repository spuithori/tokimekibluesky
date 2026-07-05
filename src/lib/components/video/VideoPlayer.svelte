<script lang="ts">
    import { setContext, untrack } from "svelte";
    import VideoLayout from '$lib/components/video/VideoLayout.svelte';
    import AudioLayout from '$lib/components/video/AudioLayout.svelte';
    import { PersistedState } from "runed";
    import { BlueskyHls } from '$lib/components/video/blueskyHls';

    let { src, poster, isTok = false, variant = 'video', title = '', artist = '' } = $props();
    const isAudio = $derived(variant === 'audio');

    let videoElement: HTMLVideoElement | undefined = $state();
    let engine: BlueskyHls | null = null;
    let usesNativeHls = $state(false);

    let paused = $state(true);
    let ended = $state(false);
    let currentTime = $state(0);
    let duration = $state(0);
    let buffered = $state(0);
    const volume = new PersistedState('volume', 1);
    const muted = new PersistedState('muted', true);
    let playbackRate = $state(1);
    let qualities: any[] = $state([]);
    let currentQuality = $state(-1);
    let isFullscreen = $state(false);
    let showControls = $state(true);
    let isHovering = $state(false);
    let isStarted = $state(false);
    let isPip = $state(false);
    const isPipSupported = typeof document !== 'undefined' && document.pictureInPictureEnabled;

    let controlsTimeout: number | undefined;

    const playerState = {
        get paused() { return paused; },
        get ended() { return ended; },
        get currentTime() { return currentTime; },
        get duration() { return duration; },
        get buffered() { return buffered; },
        get volume() { return volume.current; },
        get muted() { return muted.current; },
        get playbackRate() { return playbackRate; },
        get qualities() { return qualities; },
        get currentQuality() { return currentQuality; },
        get isFullscreen() { return isFullscreen; },
        get showControls() { return showControls; },
        get isHovering() { return isHovering; },
        get isStarted() { return isStarted; },
        get isPip() { return isPip; },
        get isPipSupported() { return isPipSupported; },
        get variant() { return variant; },
        get title() { return title; },
        get artist() { return artist; },
        togglePlay,
        seek,
        setVolume,
        toggleMute,
        setPlaybackRate,
        setQuality,
        toggleFullscreen,
        togglePictureInPicture,
        showControlsTemporarily
    };

    setContext('player', playerState);

    function togglePlay() {
        if (!videoElement) return;

        if (ended) {
            videoElement.currentTime = 0;
            ended = false;
        }

        if (paused) {
            videoElement.play();
        } else {
            videoElement.pause();
        }
    }

    function seek(time: number) {
        if (!videoElement) return;
        videoElement.currentTime = time;
    }

    function setVolume(value: number) {
        if (!videoElement) return;
        volume.current = Math.max(0, Math.min(1, value));
        videoElement.volume = volume.current;

        if (volume.current > 0 && muted.current) {
            muted.current = false;
            videoElement.muted = false;
        }
    }

    function toggleMute() {
        if (!videoElement) return;
        muted.current = !muted.current;
        videoElement.muted = muted.current;
    }

    function setPlaybackRate(rate: number) {
        if (!videoElement) return;
        playbackRate = rate;
        videoElement.playbackRate = rate;
    }

    function setQuality(index: number) {
        if (!engine) return;
        currentQuality = index;
        engine.currentLevel = index;
    }

    function toggleFullscreen() {
        const container = videoElement?.parentElement;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function showControlsTemporarily() {
        showControls = true;
        clearTimeout(controlsTimeout);

        if (!paused) {
            controlsTimeout = window.setTimeout(() => {
                if (!isHovering) {
                    showControls = false;
                }
            }, 3000);
        }
    }

    function handleMouseMove() {
        isHovering = true;
        showControlsTemporarily();
    }

    function handleMouseLeave() {
        isHovering = false;
        if (!paused) {
            clearTimeout(controlsTimeout);
            controlsTimeout = window.setTimeout(() => {
                showControls = false;
            }, 1000);
        }
    }

    async function togglePictureInPicture() {
        if (!videoElement) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoElement.requestPictureInPicture();
            }
        } catch {}
    }

    function handleKeyDown(event: KeyboardEvent) {
        switch (event.key) {
            case ' ':
            case 'k':
                event.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                seek(Math.max(0, currentTime - 5));
                break;
            case 'ArrowRight':
                event.preventDefault();
                seek(duration ? Math.min(duration, currentTime + 5) : currentTime + 5);
                break;
            case 'ArrowUp':
                event.preventDefault();
                setVolume(volume.current + 0.1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                setVolume(volume.current - 0.1);
                break;
            case 'm':
                toggleMute();
                break;
            case 'f':
                toggleFullscreen();
                break;
            default:
                return;
        }
        showControlsTemporarily();
    }

    function handleTimeUpdate() {
        if (!videoElement) return;
        currentTime = videoElement.currentTime;

        if (videoElement.buffered.length > 0) {
            buffered = videoElement.buffered.end(videoElement.buffered.length - 1);
        }
    }

    function handleLoadedMetadata() {
        if (!videoElement) return;
        duration = videoElement.duration;
    }

    function handlePlay() {
        paused = false;
        ended = false;
        if (!isStarted) {
            isStarted = true;
        }
        showControlsTemporarily();
    }

    function handlePause() {
        paused = true;
        showControls = true;
        clearTimeout(controlsTimeout);
    }

    function handleEnded() {
        ended = true;
        paused = true;
        showControls = true;
    }

    function handleVolumeChange() {
        if (!videoElement) return;
        volume.current = videoElement.volume;
        muted.current = videoElement.muted;
    }

    function handleFullscreenChange() {
        isFullscreen = !!document.fullscreenElement;
    }

    function handleEnterPip() {
        isPip = true;
    }

    function handleLeavePip() {
        isPip = false;
    }

    async function init() {
        if (!videoElement) return;

        if (src?.type === 'video/object') {
            videoElement.src = src.src;
        } else if (src?.endsWith('.m3u8')) {
            if (typeof MediaSource !== 'undefined') {
                engine = new BlueskyHls(videoElement);
                engine.onLevels = (levels, current) => {
                    qualities = levels.map((level) => ({
                        height: level.height,
                        width: level.width,
                        bitrate: level.bitrate,
                        index: level.index
                    }));
                    currentQuality = current;
                };
                engine.onError = (err) => console.error('[video] hls engine error', err);
                await engine.loadSource(src);
            } else {
                usesNativeHls = true;
                videoElement.preload = 'auto';
                videoElement.src = src;
            }
        } else {
            videoElement.src = src;
        }

        videoElement.volume = volume.current;
        videoElement.muted = muted.current;
        videoElement.playbackRate = playbackRate;

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        videoElement.addEventListener('enterpictureinpicture', handleEnterPip);
        videoElement.addEventListener('leavepictureinpicture', handleLeavePip);

        if (isTok) {
            await videoElement.play();
        }
    }

    function attachVideo(node: HTMLVideoElement) {
        videoElement = node;
        untrack(init);

        return () => {
            clearTimeout(controlsTimeout);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            node.removeEventListener('enterpictureinpicture', handleEnterPip);
            node.removeEventListener('leavepictureinpicture', handleLeavePip);

            if (engine) {
                engine.destroy();
                engine = null;
            }
        };
    }
</script>

<div
    class="video-player"
    class:video-player--is-tok={isTok}
    class:video-player--audio={isAudio}
    data-paused={paused}
    data-ended={ended}
    data-started={isStarted}
    data-controls={showControls}
    data-hover={isHovering}
    role="region"
    aria-label={isAudio ? 'Audio player' : 'Video player'}
    style:background-image={usesNativeHls && poster ? `url("${poster}")` : null}
    onmousemove={handleMouseMove}
    onmouseleave={handleMouseLeave}
>
    <video
        {@attach attachVideo}
        class="video-player__provider"
        {poster}
        tabindex="0"
        playsinline
        disableremoteplayback
        preload="metadata"
        loop={!isAudio}
        muted={muted.current}
        onkeydown={handleKeyDown}
        ontimeupdate={handleTimeUpdate}
        onloadedmetadata={handleLoadedMetadata}
        onplay={handlePlay}
        onpause={handlePause}
        onended={handleEnded}
        onvolumechange={handleVolumeChange}
    >
    </video>

    {#if isAudio}
        <AudioLayout></AudioLayout>
    {:else}
        <VideoLayout></VideoLayout>
    {/if}
</div>

<style lang="postcss">
    .video-player {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 1;
        border-radius: 8px;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;

        &__provider {
            display: block;
            background-color: transparent;
            width: 100%;
            height: 100%;
        }
    }

    @supports (-webkit-touch-callout: none) {
        .video-player__provider {
            position: relative;
            z-index: 0;
        }

        :global(.video-player-layout),
        :global(.audio-player) {
            z-index: 1;
            transform: translateZ(0);
        }
    }

    :global {
        .video-controls-button {
            position: relative;
            z-index: 1;
            background-color: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;

            &::before {
                content: '';
                display: block;
                position: absolute;
                background-color: rgba(0, 0, 0, .3);
                width: 32px;
                height: 32px;
                left: 50%;
                top: 50%;
                transform: translateY(-50%) translateX(-50%);
                border-radius: 50%;
                z-index: -1;
                transition: all .2s ease-in-out;
                opacity: 0;
            }

            &[data-hover] {
                &::before {
                    opacity: 1;
                }
            }
        }

        .video-caption-button {
            display: none;

            &:not([data-active]) {
                .video-caption-button--on {
                    display: none;
                }
            }

            &[data-active] {
                .video-caption-button--off {
                    display: none;
                }
            }

            &[data-supported] {
                display: block;
            }
        }

        .video-player-layout {
            position: absolute;
            inset: 0;
        }
    }
</style>