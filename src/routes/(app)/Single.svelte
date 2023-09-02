<script lang="ts">
    import {
        agent,
        currentTimeline,
        timelines,
        cursors,
        singleColumn,
        columns, globalUnique,
    } from '$lib/stores';
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import DeckRow from "./DeckRow.svelte";

    let isAlgoNavOpen = false;
    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let unique = Symbol();
    let customFeeds;

    if ($agent) {
        customFeeds = $agent.getSavedFeeds()
    }

    if (!$columns.length) {
        columns.set([{
            id: 1,
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default',
            did: $agent.did(),
            handle: $agent.handle(),
            unreadCount: 0,
        }]);
    }

    if (!$columns[$currentTimeline]) {
        currentTimeline.set(0);
    }

    $: {
        if (isAlgoNavOpen) {
            document.body.classList.add('scroll-lock');
        } else {
            document.body.classList.remove('scroll-lock');
        }
    }

    function openAlgoNav(currentAlgo) {
        isAlgoNavOpen = isAlgoNavOpen !== true;
        if (currentAlgo) {
            $singleColumn.algorithm = currentAlgo;

            if (!isAlgoNavOpen && $singleColumn.algorithm.type !== 'realtime') {
                $timelines[$currentTimeline] = [];
                $cursors[$currentTimeline] = undefined;
                unique = Symbol();
            }
        }
    }

    function handleFeedsClose(event) {
        customFeeds = $agent.getSavedFeeds();

        if (event.detail.allClose) {
            isAlgoNavOpen = false;
            unique = Symbol();
        }
    }

    function handleBookmarkClose(event) {
        if (event.detail.clear) {
            resetColumnDefault();
            unique = Symbol();
        }
    }

    function handleListClose(event) {
        if ($singleColumn.algorithm.type === 'list' && $singleColumn.algorithm.list && event.detail.id === $singleColumn.algorithm.list) {
            resetColumnDefault();
            unique = Symbol();
        }
    }

    function resetColumnDefault() {
        $singleColumn = {
            id: 1,
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default'
        };
        $timelines[$currentTimeline] = [];
        $cursors[$currentTimeline] = undefined;
    }
</script>

<div class="single-wrap">
  {#key $globalUnique}
    <div class="single-timeline-wrap">
      {#key $currentTimeline}
        {#if ($columns.length && $columns[$currentTimeline])}
          <DeckRow
              column={$columns[$currentTimeline]}
              index={$currentTimeline}
          ></DeckRow>
        {/if}
      {/key}
    </div>
  {/key}
</div>

<style lang="postcss">
    .single-wrap {
        border-left: 1px solid var(--border-color-2);
        border-right: 1px solid var(--border-color-2);
        min-height: 100vh;
        background-color: var(--bg-color-1);
    }

    .timeline-algo-nav {
        order: -1;
        width: 230px;
        margin: auto;
        height: 40px;
        position: fixed;
        z-index: 100;
        left: 0;
        right: 0;
        top: 15px;

        @media (max-width: 767px) {
            order: -1;
            width: 190px;
            margin: auto;
            height: 40px;
            position: fixed;
            left: 0;
            right: 0;
            top: 20px;
        }
    }

    .algo-nav {
        position: relative;

        &--open {
            position: fixed;
            z-index: 9998;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;

            .algo-nav-list {
                position: absolute;
                left: 0;
                right: 0;
                top: 15px;
                margin: auto;
                display: flex;
                flex-direction: column;
                gap: 20px;
                align-items: center;
                justify-content: center;

                @media (max-width: 767px) {
                    top: 20px;
                }
            }

            .algo-nav-bg {
                opacity: 1;
                visibility: visible;
            }

            .algo-nav-edit {
                display: block;
            }

            .algo-nav-button {
                &:not(.algo-nav-button--current) {
                    display: block;
                }
            }
        }
    }

    .algo-nav-bg {
        opacity: 0;
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        visibility: hidden;
        backdrop-filter: blur(5px);
        background-color: rgba(0, 8, 25, .8);
        transition: all .3s ease-in-out;
    }

    .algo-nav-list {
        list-style: none;

        &__item {
            position: relative;

            @media (max-width: 767px) {
                display: flex;
                justify-content: center;
                width: 190px;
                margin-left: auto;
                margin-right: auto;
            }

            &:has(.algo-nav-button--current) {
                order: -1;
            }
        }
    }

    .algo-nav-button {
        width: 230px;
        height: 40px;
        align-items: center;
        justify-content: center;
        text-align: center;
        border-radius: 20px;
        background-color: var(--bg-color-1);
        box-shadow: 0 2px 14px rgba(0, 0, 0, .08);
        color: var(--text-color-1);
        font-weight: 900;
        cursor: pointer;
        transition: box-shadow .2s ease-in-out;
        letter-spacing: .05em;
        position: relative;
        text-overflow: ellipsis;
        overflow: hidden;
        padding: 0 35px;
        font-size: 15px;
        line-height: 1.25;

        @media (max-width: 767px) {
            width: 190px;
            font-size: 13px;
        }

        svg {
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            margin: auto;
        }

        &:hover {
            box-shadow: 0 2px 24px rgba(0, 0, 0, .16);
        }

        &:not(.algo-nav-button--current) {
            display: none;
        }

        &--current {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;

            &::after {
                content: '';
                display: block;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11.599' height='7.421' viewBox='0 0 11.599 7.421'%3E%3Cpath id='パス_27' data-name='パス 27' d='M4393.408,794.858l4.389,5.01,4.388-5.01' transform='translate(-4391.997 -793.447)' fill='none' stroke='%231d1d1d' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/%3E%3C/svg%3E%0A");
                width: 12px;
                height: 8px;
                background-size: contain;
                margin-top: 2px;
                flex-shrink: 0;
            }

            & + .algo-nav-edit {
                display: block;
            }
        }

        &--add {
            background-color: var(--primary-color);
            color: var(--bg-color-1);
            font-weight: 600;
        }

        &--add-list {
            background-color: var(--color-theme-4);

            @media (max-width: 767px) {
                font-size: 14px;
                padding: 0 10px;
            }
        }

        &--add-bookmark {
            background-color: var(--color-theme-8);

            @media (max-width: 767px) {
                font-size: 14px;
                padding: 0 10px;
            }
        }
    }

    .algo-nav-edit {
        position: absolute;
        right: 10px;
        top: 0;
        bottom: 0;
        margin: auto;
        display: none;
    }
</style>