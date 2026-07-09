<script lang="ts">
    import { settings, intersectingIndex } from "$lib/stores";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import {page} from '$app/stores';
    import Home from '@lucide/svelte/icons/home';
    import Pen from '@lucide/svelte/icons/pen';
    import PenOff from '@lucide/svelte/icons/pen-off';
    import Plus from '@lucide/svelte/icons/plus';
    import Settings from '@lucide/svelte/icons/settings';
    import {iconMap} from "$lib/columnIcons";
    import SideNav from "$lib/components/side/SideNav.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {findPublishColumn} from "$lib/publishColumn";
    import {untrack} from "svelte";
    import {runCommand} from "$lib/commands/registry.svelte";
    import {riceState} from "$lib/rice/riceState.svelte";

    const columnState = getColumnState();
    const isPublishActive = $derived(riceState.layoutStyle === 'deck'
        ? !!findPublishColumn(columnState.columns)
        : publishState.show);

    let pillVisible = $state(false);
    let pillClear = false;
    let els = $state([]);

    const switcher = $derived(riceState.switcher);
    const reveal = $derived(switcher?.reveal ?? 'scroll');
    const switcherVars = $derived.by(() => {
        if (!switcher) return '';
        const p = switcher.props;
        let style = '';
        if (p.height) style += `--rice-switcher-height: ${p.height};`;
        if (p.background) style += `--rice-switcher-bg: ${p.background};`;
        if (p.blur) style += `--rice-switcher-backdrop: blur(${p.blur});`;
        if (p.rounding) style += `--rice-switcher-rounding: ${p.rounding};`;
        if (p.offset) style += `--rice-switcher-offset: ${p.offset};`;
        return style;
    });


    function handleColumnClick(column, index) {
        runCommand('column.focus', String(index + 1));
    }

    function handleKeydown(event) {
        if ($page.url.pathname !== '/') {
            return false;
        }

        const activeElement = document.activeElement?.tagName;
        const isInactive = (activeElement === 'BODY' || activeElement === 'BUTTON' || document.activeElement?.classList.contains('deck-row'));

        columnState.slots.forEach((slot, index) => {
            const i = index + 1;

            if (event.key === String(i) && isInactive) {
                handleColumnClick(columnState.getSlotColumn(index), index)
            }
        })
    }

    $effect(() => {
      if (reveal === 'auto') {
        if ($intersectingIndex !== undefined) {
          pillVisible = true;

          if (els[$intersectingIndex]) {
            els[$intersectingIndex].scrollIntoView({inline: 'center', behavior: 'smooth'});
          }

          if (pillClear) {
            untrack(() => {
              clearTimeout(pillClear);
            })
          }

          pillClear = setTimeout(() => {
            pillVisible = false;
          }, 2500);
        }
      }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="side-bar"
 class:side-bar--scroll-down={scrollDirectionState.direction === 'down' && reveal === 'scroll'}
 class:side-bar--pill={switcher?.style === 'pill'}
 class:side-bar--pill-top={switcher?.style === 'pill' && switcher.position === 'top'}
 class:side-bar--dock-bottom={switcher?.style === 'strip' && switcher.position === 'bottom'}
 class:side-bar--auto-hidden={reveal === 'auto' && !pillVisible}
 class:side-bar--no-add-mobile={switcher !== null && !switcher.showAdd}
 style={switcherVars}>
  <div class="side-bar__list side-bar__top">
    {#if riceState.sidebar?.showPublish ?? true}
      <button
            class="side-publish-button"
            onclick={() => runCommand('publish.toggle')}
            aria-label="Publish Tab"
      >
        {#if (isPublishActive)}
          <PenOff color="var(--bar-primary-icon-color)"></PenOff>
        {:else}
          <Pen color="var(--bar-primary-icon-color)"></Pen>
        {/if}
      </button>
    {/if}

    {#if $page.url.pathname === '/'}
      {#if riceState.sidebar?.showAdd ?? true}
        <button
            class="side-bar-button side-column-add-button"
            onclick={() => runCommand('column.add')}
        >
          <Plus color="var(--bar-primary-icon-color)"></Plus>
        </button>
      {/if}

      {#each columnState.slots as slot, index (slot.id)}
        {@const column = columnState.getSlotColumn(index)}
        <button
            class="side-bar-button"
            class:side-bar-button--current={riceState.layoutStyle === 'single' && index === columnState.activeSlotIndex}
            class:side-bar-button--intersecting={$intersectingIndex === index && riceState.layoutStyle === 'deck'}
            onclick={() => {handleColumnClick(column, index)}}
            aria-label={column?.algorithm?.name}
            title={column?.algorithm?.name}
            bind:this={els[index]}
        >
          {#if column?.settings?.icon}
            {@const SvelteComponent = iconMap.get(column.settings.icon)}
            <SvelteComponent color="var(--bar-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></SvelteComponent>
          {:else}
            <ColumnIcon type={column?.algorithm?.type} color="var(--bar-secondary-icon-color)"></ColumnIcon>
          {/if}

          {#if (column?.unreadCount)}
            <span class="side-bar-button__count">
              {column?.settings?.hideCounts ? '' : column.unreadCount}
            </span>
          {/if}
        </button>
      {/each}
    {:else}
      <a
          class="side-bar-button"
          href="/"
      >
        <Home color="var(--bar-bottom-icon-color)"></Home>
      </a>
    {/if}
  </div>

  <div class="side-bar__list side-bar__bottom">
    <div class="side-bar__nav">
      <SideNav></SideNav>
    </div>

    {#if riceState.sidebar?.showSettings ?? true}
      <a class="side-bar-button side-bar-button--settings only-pc" href="/settings/general">
        <Settings color="var(--bar-bottom-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Settings>
      </a>
    {/if}
  </div>
</div>

<style lang="postcss">
    .side-bar {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 0 8px;
        overflow: hidden;
        transition: transform .2s ease-in-out, opacity .2s ease-in-out, visibility .2s ease-in-out;

        &::-webkit-scrollbar {
            display: none;
        }

        @media (max-width: 767px) {
            display: flex;
            flex-direction: row;
            position: fixed;
            gap: 0;
            top: 0;
            left: 0;
            right: 0;
            z-index: 999;
            background: var(--rice-switcher-bg, var(--bar-bg-color));
            backdrop-filter: var(--rice-switcher-backdrop, blur(8px));
            height: var(--rice-switcher-height, min-content);
            padding: 0 4px 0 8px;
            width: 100vw;
            overflow-x: auto;
        }

        &__list {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;

            @media (max-width: 767px) {
                flex-direction: row;
                gap: 0;
            }
        }


        &__bottom {

        }

        &__top {
            @media (min-width: 768px) {
                overflow-x: hidden;
                scrollbar-width: none;
                position: relative;
                padding-bottom: 16px;

                &::after {
                    content: '';
                    display: block;
                    position: sticky;
                    bottom: -16px;
                    width: 100%;
                    height: 16px;
                    background-image: linear-gradient(to top, var(--side-bg-color, var(--base-bg-color)), transparent);
                    pointer-events: none;
                    flex-shrink: 0;
                }
            }
        }

        &--scroll-down {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
                transform: translateY(-48px);
            }
        }

        &--dock-bottom {
            @media (max-width: 767px) {
                top: auto;
                bottom: 0;
                padding-bottom: var(--safe-area-bottom);
            }

            &.side-bar--scroll-down {
                @media (max-width: 767px) {
                    transform: translateY(calc(48px + var(--safe-area-bottom)));
                }
            }
        }

        &--pill {
            @media (max-width: 767px) {
                backdrop-filter: var(--rice-switcher-backdrop, none);
                width: fit-content;
                max-width: 80vw;
                bottom: var(--rice-switcher-offset, calc(var(--rice-footer-height, 56px) + var(--safe-area-bottom) + 16px));
                top: auto;
                left: 0;
                right: 0;
                margin: auto;
                box-shadow: var(--timeline-embed-box-shadow);
                border-radius: var(--rice-switcher-rounding, 24px);
                transform: none !important;
            }
        }

        &--pill-top {
            @media (max-width: 767px) {
                top: var(--rice-switcher-offset, 8px);
                bottom: auto;
            }
        }

        &--auto-hidden {
            @media (max-width: 767px) {
                opacity: 0;
                visibility: hidden;
            }
        }

        &--no-add-mobile {
            @media (max-width: 767px) {
                .side-column-add-button {
                    display: none;
                }
            }
        }
    }

    .side-bar-button {
        width: 48px;
        height: 48px;
        border-radius: 5px;
        background-color: transparent;
        display: grid;
        place-content: center;
        position: relative;
        flex-shrink: 0;

        &::before {
            content: '';
            display: block;
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: var(--bar-current-bar-width);
            height: var(--bar-current-bar-height);
            border-radius: var(--bar-current-bar-border-radius);
            background-color: var(--bar-current-bar-color);
            margin: auto;
            transform: scaleY(0);
            transition: transform .25s cubic-bezier(0, 0, 0.18, 1);

            @media (max-width: 767px) {
                width: 20px;
                height: 4px;
                bottom: auto;
                right: 0;
            }
        }

        &--current {
            &::before {
                transform: scaleY(1);
            }
        }

        &--intersecting {
            @media (max-width: 767px) {
                &::before {
                    transform: scaleY(1);
                }
            }
        }

        &__count {
            position: absolute;
            width: 16px;
            height: 16px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 50%;
            background-color: var(--danger-color);
            color: var(--bg-color-1);
            display: grid;
            place-content: center;
            right: -2px;
            top: -2px;

            @media (max-width: 767px) {
                top: 4px;
                right: 2px;
                width: 14px;
                height: 14px;
                font-size: 10px;
            }
        }
    }

    .side-column-add-button {
        width: 40px;
        height: 40px;
        border-radius: var(--border-radius-3);
        border: 1px solid var(--primary-color);
        box-shadow: rgba(0, 0, 0, 0.1) 0 4px 6px -1px, rgba(0, 0, 0, 0.04) 0 2px 4px -1px;
        background-color: var(--nav-content-bg-color);

        @media (max-width: 767px) {
            margin-bottom: 0;
            width: 36px;
            height: 36px;
            margin-right: 6px;
        }
    }

    .side-publish-button {
        --bar-primary-icon-color: var(--bg-color-1);
        width: 40px;
        height: 40px;
        border-radius: 5px;
        display: grid;
        place-content: center;
        background-color: var(--primary-color);
        margin-bottom: 4px;
        flex-shrink: 0;

        @media (max-width: 767px) {
            display: none;
        }
    }
</style>