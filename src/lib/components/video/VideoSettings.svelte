<script lang="ts">
    import { getContext } from "svelte";
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import Gauge from '@lucide/svelte/icons/gauge';
    import Settings from '@lucide/svelte/icons/settings';
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
    import { fly } from 'svelte/transition';

    const player: any = getContext('player');

    let menuOpen = $state(false);
    let speedMenuOpen = $state(false);
    let qualityMenuOpen = $state(false);

    const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    function toggleMenu() {
        menuOpen = !menuOpen;
        if (!menuOpen) {
            speedMenuOpen = false;
            qualityMenuOpen = false;
        }
    }

    function toggleSpeedMenu() {
        speedMenuOpen = !speedMenuOpen;
        qualityMenuOpen = false;
    }

    function toggleQualityMenu() {
        qualityMenuOpen = !qualityMenuOpen;
        speedMenuOpen = false;
    }

    function selectSpeed(speed: number) {
        player.setPlaybackRate(speed);
        speedMenuOpen = false;
    }

    function selectQuality(index: number) {
        player.setQuality(index);
        qualityMenuOpen = false;
    }

    function handleClickOutside(e: MouseEvent) {
        const target = e.target as HTMLElement;
        if (!target.closest('.video-menu-wrap')) {
            menuOpen = false;
            speedMenuOpen = false;
            qualityMenuOpen = false;
        }
    }

    $effect(() => {
       /*  if (menuOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        } */
    });

    let speedLabel = $derived(player.playbackRate === 1 ? 'Normal' : `${player.playbackRate}x`);
    let qualityLabel = $derived(player.currentQuality === -1 ? 'Auto' :
        player.qualities[player.currentQuality]?.height ? `${player.qualities[player.currentQuality].height}p` : 'Auto');
</script>

<div class="video-menu-wrap">
    <button
        class="video-controls-button video-settings-button"
        data-open={menuOpen}
        onclick={toggleMenu}
        aria-label="Settings"
    >
        <Settings size="20" color="#fff" class="video-settings-button--settings" />
    </button>

    {#if menuOpen}
        <div class="video-menu-items" data-root data-open={menuOpen} transition:fly={{ y: 20, duration: 250 }}>
            {#if speedMenuOpen}
                <div class="video-menu-item">
                    <button class="video-submenu-button" data-open={speedMenuOpen} onclick={toggleSpeedMenu}>
                        <ChevronLeft size="20" class="video-submenu-close-button" />
                        <span class="video-submenu-label">Speed</span>
                    </button>

                    <div class="video-radio-group">
                        {#each speedOptions as speed}
                            <button
                                class="video-radio"
                                class:video-radio--checked={player.playbackRate === speed}
                                onclick={() => selectSpeed(speed)}
                            >
                                <span class="video-radio-icon"></span>
                                <span class="video-radio-label">{speed === 1 ? 'Normal' : `${speed}x`}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else if qualityMenuOpen}
                <div class="video-menu-item">
                    <button class="video-submenu-button" data-open={qualityMenuOpen} onclick={toggleQualityMenu}>
                        <ChevronLeft size="20" class="video-submenu-close-button" />
                        <span class="video-submenu-label">Quality</span>
                    </button>

                    <div class="video-radio-group">
                        <button
                            class="video-radio"
                            class:video-radio--checked={player.currentQuality === -1}
                            onclick={() => selectQuality(-1)}
                        >
                            <span class="video-radio-icon"></span>
                            <span class="video-radio-label">Auto</span>
                        </button>
                        {#each player.qualities as quality, index}
                            <button
                                class="video-radio"
                                class:video-radio--checked={player.currentQuality === index}
                                onclick={() => selectQuality(index)}
                            >
                                <span class="video-radio-icon"></span>
                                <span class="video-radio-label">{quality.height}p</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {:else}
                <div class="video-menu-item">
                    <button class="video-submenu-button" onclick={toggleSpeedMenu}>
                        <Gauge size="18" class="video-submenu-icon" />
                        <span class="video-submenu-label">Speed</span>
                        <span class="video-submenu-hint">{speedLabel}</span>
                        <ChevronRight size="14" class="video-submenu-open-button" />
                    </button>
                </div>

                {#if player.qualities.length > 0}
                    <div class="video-menu-item">
                        <button class="video-submenu-button" onclick={toggleQualityMenu}>
                            <SlidersHorizontal size="18" class="video-submenu-icon" />
                            <span class="video-submenu-label">Quality</span>
                            <span class="video-submenu-hint">{qualityLabel}</span>
                            <ChevronRight size="14" class="video-submenu-open-button" />
                        </button>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</div>

<style lang="postcss">
    .video-menu-wrap {
        position: relative;
    }

    .video-menu-items {
        padding: 8px;
        box-shadow: var(--menu-box-shadow);
        border: var(--menu-border);
        border-radius: var(--menu-border-radius);
        background-color: var(--menu-bg-color);
        display: flex;
        flex-direction: column;
        color: var(--text-color-1);
        min-width: 180px;
        position: absolute;
        bottom: calc(100% + 12px);
        right: 0;
        z-index: 10;
        overflow: hidden;

        &[data-transition='height'] {
            pointer-events: none;
            overflow: hidden;
        }

        &:not([data-open]) {
            display: none;
        }
    }

    .video-submenu-button {
        display: flex;
        align-items: center;
        width: 100%;
        gap: 8px;
        font-size: 14px;
        padding: 8px 12px;
        background-color: transparent;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        color: inherit;

        &:hover {
            background-color: var(--menu-hover-bg-color);
            text-decoration: none;
        }

        &:not([data-open]) {
            .video-submenu-close-button {
                display: none;
            }
        }

        &[data-open] {
            margin-bottom: 8px;
            border-radius: var(--menu-border-radius) var(--menu-border-radius) 0 0;

            .video-submenu-open-button {
                display: none;
            }

            .video-submenu-icon {
                display: none;
            }
        }
    }

    .video-submenu-hint {
        margin-left: auto;
        color: var(--text-color-3);
    }

    .video-radio-group {
        display: flex;
        flex-direction: column;

    }

    .video-menu-item {
        &[data-hidden] {
            display: none !important;
        }
    }

    .video-radio-group {
        font-size: 14px;
    }

    .video-radio {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background-color: transparent;
        border: none;
        cursor: pointer;
        width: 100%;
        color: inherit;

        &:hover {
            background-color: var(--menu-hover-bg-color);
            text-decoration: none;
        }

        &--checked {
            .video-radio-icon {
                &::before {
                    opacity: 1;
                    visibility: visible;
                }
            }
        }
    }

    .video-radio-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: var(--border-color-1);
        display: grid;
        place-content: center;

        &::before {
            content: '';
            display: block;
            width: 8px;
            height: 8px;
            background-color: var(--primary-color);
            border-radius: 50%;
            opacity: 0;
            visibility: hidden;
        }
    }
</style>