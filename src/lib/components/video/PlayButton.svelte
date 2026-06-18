<script lang="ts">
    import { getContext } from "svelte";

    const player: any = getContext('player');

    function handleClick() {
        player.togglePlay();
    }
</script>

<button
    class="video-play-button"
    onclick={handleClick}
    ondblclick={() => {player.toggleFullscreen()}}
    aria-label={player.paused ? 'Play' : 'Pause'}
></button>

<style lang="postcss">
    .video-play-button {
        position: absolute;
        inset: 0 0 50px;
        margin: auto;
        background-color: transparent;
        display: grid;
        place-content: center;
        border: none;
        cursor: pointer;
        outline: none;

        &[data-hover] {
            &::before {
                opacity: 1;
            }
        }

        &--play,
        &--replay {
            margin-left: 5px;
        }

        &--pause {

        }
    }
</style>