<script lang="ts">
    import { currentTimeline, settings, isColumnModalOpen, intersectingIndex } from "$lib/stores";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import {page} from '$app/stores';
    import {Home, Pen, PenOff, Plus, Settings, SquarePlus} from "lucide-svelte";
    import {iconMap} from "$lib/columnIcons";
    import SideNav from "$lib/components/side/SideNav.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {untrack} from "svelte";

    const columnState = getColumnState();
    let mobileV2Visible = $state(false);
    let mobileV2Clear = false;
    let els = $state([]);

    if (!columnState.columns[$currentTimeline]) {
        currentTimeline.set(0);
    }

    function handleColumnClick(column, index) {
        if ($settings.design.layout === 'decks') {
            if (column.scrollElement) {
                column.scrollElement.scrollIntoView({inline: 'end', behavior: 'instant'});
            }
        } else {
            if ($currentTimeline === index) {
                return false;
            }

            currentTimeline.set(index);
        }
    }

    function handleKeydown(event) {
        if ($page.url.pathname !== '/') {
            return false;
        }

        const activeElement = document.activeElement?.tagName;
        const isInactive = (activeElement === 'BODY' || activeElement === 'BUTTON');

        columnState.columns.forEach((column, index) => {
            const i = index + 1;

            if (event.key === String(i) && isInactive) {
                handleColumnClick(column, index)
            }
        })
    }

    $effect(() => {
      if ($settings?.design?.mobileNewUi) {
        if ($intersectingIndex !== undefined) {
          mobileV2Visible = true;

          if (els[$intersectingIndex]) {
            els[$intersectingIndex].scrollIntoView({inline: 'center', behavior: 'smooth'});
          }

          if (mobileV2Clear) {
            untrack(() => {
              clearTimeout(mobileV2Clear);
            })
          }

          mobileV2Clear = setTimeout(() => {
            mobileV2Visible = false;
          }, 2500);
        }
      }
    });
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="side-bar side-bar--{publishState.layout}" class:side-bar--scroll-down={scrollDirectionState.direction === 'down'} class:side-bar--mobileV2={$settings?.design?.mobileNewUi}
 class:side-bar--mobileV2-visible={mobileV2Visible && $settings?.design?.mobileNewUi}>
  <div class="side-bar__list side-bar__top">
    <button
          class="side-publish-button"
          onclick={() => {publishState.show = !publishState.show}}
          aria-label="Publish Tab"
    >
      {#if (publishState.show)}
        <PenOff color="var(--bar-primary-icon-color)"></PenOff>
      {:else}
        <Pen color="var(--bar-primary-icon-color)"></Pen>
      {/if}
    </button>

    {#if $page.url.pathname === '/'}
      <button
          class="side-bar-button side-column-add-button"
          onclick={() => {$isColumnModalOpen = true}}
      >
        <Plus color="var(--bar-primary-icon-color)"></Plus>
      </button>

      {#each columnState.columns as column, index (column.id)}
        <button
            class="side-bar-button"
            class:side-bar-button--current={$settings.design.layout !== 'decks' && column.id === columnState.columns[$currentTimeline].id}
            class:side-bar-button--intersecting={$intersectingIndex === index && $settings.design.layout === 'decks'}
            onclick={() => {handleColumnClick(column, index)}}
            aria-label={column.algorithm?.name}
            title={column.algorithm?.name}
            bind:this={els[index]}
        >
          {#if column.settings?.icon}
            {@const SvelteComponent = iconMap.get(column.settings.icon)}
            <SvelteComponent color="var(--bar-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></SvelteComponent>
          {:else}
            <ColumnIcon type={column.algorithm.type} color="var(--bar-secondary-icon-color)"></ColumnIcon>
          {/if}

          {#if (column.unreadCount)}
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
    {#if (publishState.isBottom)}
      <div class="side-bar__nav">
        <SideNav></SideNav>
      </div>
    {/if}

    <a class="side-bar-button side-bar-button--settings only-pc" href="/settings/general">
      <Settings color="var(--bar-bottom-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Settings>
    </a>
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
            background: var(--bar-bg-color);
            backdrop-filter: blur(8px);
            height: min-content;
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
                    background-image: linear-gradient(to top, var(--base-bg-color), transparent);
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

        &--mobileV2 {
            @media (max-width: 767px) {
                backdrop-filter: none;
                width: fit-content;
                max-width: 80vw;
                bottom: 128px;
                top: auto;
                left: 0;
                right: 0;
                margin: auto;
                box-shadow: var(--timeline-embed-box-shadow);
                border-radius: 24px;

                transform: none !important;
                opacity: 0;
                visibility: hidden;

                &.side-bar--mobileV2-visible {
                    opacity: 1;
                    visibility: visible;
                }

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
        outline: none !important;

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