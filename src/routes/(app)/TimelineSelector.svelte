<script lang="ts">
    import {
        agent,
        cursors,
        notificationCount,
        timelines,
        settings,
        columns, singleColumn,
    } from "$lib/stores";
    import RealtimeTimeline from "./RealtimeTimeline.svelte";
    import BookmarkTimeline from "./BookmarkTimeline.svelte";
    import ListTimeline from "./ListTimeline.svelte";
    import Timeline from "./Timeline.svelte";
    import TimerEvent from "$lib/components/utils/TimerEvent.svelte";

    export let column;
    export let index;
    export let unique;
    let isRefreshing = false;

    export async function refresh() {
        isRefreshing = true;
        if (column.algorithm.type === 'default' || column.algorithm.type === 'custom') {
            const res = await $agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
            const newFeeds = res.data.feed.filter(feed => {
                return !$timelines[index].some(item => feed.reason ? item.post.uri === feed.post.uri && item.reason?.indexedAt === feed.reason.indexedAt : item.post.uri === feed.post.uri);
            });

            if (newFeeds.length === 20) {
                $timelines[index] = res.data.feed;
                $cursors[index] = res.data.cursor;
            } else {
                const el = column.scrollElement ?? document;
                const topEl = el.querySelector('.timeline > .timeline__item:first-child');

                await timelines.update(function (tls) {
                    return tls.map((tl, i) => {
                        if (i === index) {
                            return [...newFeeds, ...tl];
                        }
                        return tl;
                    })
                });

                if (column.style !== 'media'){
                  if (column.scrollElement) {
                    column.scrollElement.scrollTo(0, topEl.getBoundingClientRect().top - 200);
                  } else {
                    window.scrollTo(0, topEl.getBoundingClientRect().top - 156);
                  }
                }
            }

            notificationCount.set(await $agent.getNotificationCount());
        } else if (column.algorithm.type === 'bookmark') {
            $timelines[index] = [];
            $cursors[index] = 0;
            unique = Symbol();
        } else if (column.algorithm.type === 'realtime') {
            return false;
        } else {
            $timelines[index] = [];
            $cursors[index] = undefined;
            unique = Symbol();
        }

        isRefreshing = false;
    }

    function toggleStyle(style: 'default' | 'media') {
        if ($settings?.design.layout === 'decks') {
            $columns[index].style = style;
        } else {
            $singleColumn.style = style;
        }


        if (column.algorithm.type !== 'realtime') {
            $timelines[index] = [];
            $cursors[index] = undefined;
            unique = Symbol();
        }
    }

    function handleTimer() {
      refresh();
    }

    function handleKeydown(event: { key: string; }) {
      const activeElement = document.activeElement?.tagName;

      if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
        refresh();
      }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="timeline-style-nav">
  <div class="style-nav" data-current="{column.style}">
    <div class="style-nav__item style-nav__item--active style-nav__item--default">
      <button aria-label="Default Timeline" class="style-nav__button" on:click={() => {toggleStyle('default')}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="25.694" height="14.988" viewBox="0 0 25.694 14.988">
          <g id="menu-outline" transform="translate(-64 -144)">
            <path id="線_27" data-name="線 27" d="M8.623-13.859H-14.929A1.071,1.071,0,0,1-16-14.929,1.071,1.071,0,0,1-14.929-16H8.623a1.071,1.071,0,0,1,1.071,1.071A1.071,1.071,0,0,1,8.623-13.859Z" transform="translate(80 160)" fill="var(--text-color-1)"/>
            <path id="線_28" data-name="線 28" d="M8.623-13.859H-14.929A1.071,1.071,0,0,1-16-14.929,1.071,1.071,0,0,1-14.929-16H8.623a1.071,1.071,0,0,1,1.071,1.071A1.071,1.071,0,0,1,8.623-13.859Z" transform="translate(80 166.423)" fill="var(--text-color-1)"/>
            <path id="線_29" data-name="線 29" d="M8.623-13.859H-14.929A1.071,1.071,0,0,1-16-14.929,1.071,1.071,0,0,1-14.929-16H8.623a1.071,1.071,0,0,1,1.071,1.071A1.071,1.071,0,0,1,8.623-13.859Z" transform="translate(80 172.847)" fill="var(--text-color-1)"/>
          </g>
        </svg>
      </button>
    </div>

    <div class="style-nav__item style-nav__item--media">
      <button aria-label="Media Timeline" class="style-nav__button" on:click={() => {toggleStyle('media')}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="17.143" viewBox="0 0 20 17.143">
          <path id="image" d="M49.143,64H34.857A2.86,2.86,0,0,0,32,66.857V78.286a2.86,2.86,0,0,0,2.857,2.857H49.143A2.86,2.86,0,0,0,52,78.286V66.857A2.86,2.86,0,0,0,49.143,64Zm-3.571,2.857A2.143,2.143,0,1,1,43.429,69a2.143,2.143,0,0,1,2.143-2.143ZM34.857,79.714a1.429,1.429,0,0,1-1.429-1.429V75.267L37.662,71.5a2.146,2.146,0,0,1,2.938.085l2.9,2.893-5.233,5.233Zm15.714-1.429a1.429,1.429,0,0,1-1.429,1.429H40.287l5.421-5.421a2.13,2.13,0,0,1,2.752-.007l2.112,1.76Z" transform="translate(-32 -64)" fill="var(--text-color-1)"/>
        </svg>
      </button>
    </div>

    <span class="style-nav__corner style-nav__corner--left"></span>
    <span class="style-nav__corner style-nav__corner--right"></span>
  </div>
</div>

{#if (column.algorithm.type !== 'bookmark' && column.algorithm.type !== 'realtime')}
  <button
      class="refresh-button"
      class:refresh-button--decks={$settings.design.layout === 'decks'}
      class:is-refreshing={isRefreshing}
      aria-label="Refresh"
      on:click={() => {refresh()}}
      disabled={isRefreshing}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="22.855" viewBox="0 0 16 22.855">
      <path id="refresh" d="M11,3.428V5.714a5.714,5.714,0,0,0-4.045,9.759L5.343,17.084A8,8,0,0,1,11,3.428Zm5.657,2.343A8,8,0,0,1,11,19.427V17.141a5.714,5.714,0,0,0,4.045-9.759ZM11,22.855,6.428,18.284,11,13.713ZM11,9.142V0L15.57,4.571Z" transform="translate(-2.999)" fill="var(--primary-color)"/>
    </svg>
  </button>
{/if}

{#if (column.algorithm.type === 'list')}
    {#key unique}
      <ListTimeline column={column} index={index}></ListTimeline>
    {/key}
{:else if (column.algorithm.type === 'bookmark')}
    {#key unique}
      <BookmarkTimeline column={column} index={index}></BookmarkTimeline>
    {/key}
{:else if (column.algorithm.type === 'realtime')}
  <RealtimeTimeline
      column={column}
      index={index}></RealtimeTimeline>
{:else}
  {#key unique}
    <Timeline column={column} index={index}></Timeline>
  {/key}
{/if}

{#if (column.settings?.autoRefresh && column.settings?.autoRefresh > 0)}
  <TimerEvent delay={Number(column.settings.autoRefresh) * 1000} on:timer={handleTimer}></TimerEvent>
{/if}

<style lang="postcss">
    .style-nav {
        width: 114px;
        border-radius: 10px 10px 0 0;
        height: 36px;
        display: flex;
        position: relative;
        border-left: 1px solid var(--border-color-1);
        border-top: 1px solid var(--border-color-1);
        border-right: 1px solid var(--border-color-1);
        margin-left: 20px;
        background-color: var(--bg-color-2);

        @media (max-width: 767px) {
            margin-left: 0;
        }

        &::after {
            content: '';
            display: block;
            position: absolute;
            top: 100%;
            left: -8px;
            right: -8px;
            background-color: var(--bg-color-1);
            height: 8px;
            z-index: 3;
        }

        &::before {
            content: '';
            display: block;
            position: absolute;
            top: -1px;
            left: -1px;
            bottom: 0;
            height: 36px;
            width: 57px;
            border-radius: 10px 10px 0 0;
            background-color: var(--bg-color-1);
            z-index: 2;
            box-shadow: 0 0 8px rgba(0, 0, 0, .12);
        }

        &[data-current='default'] {
            &::before {
                transform: translateX(0);
            }

            .style-nav__item--default {
                width: 57px;

                path {
                    fill: var(--primary-color);
                }
            }
        }

        &[data-current='media'] {
            &::before {
                transform: translateX(58px);
            }

            .style-nav__item--media {
                width: 57px;

                path {
                    fill: var(--primary-color);
                }
            }

            .style-nav__corner {
                &--left {
                    transform: translateX(calc(-100% + 58px));
                }

                &--right {
                    transform: scale(-1, 1) translateX(-11px);
                }
            }
        }

        svg {
            position: relative;
            z-index: 3;
        }

        &__item {
            position: relative;
            width: 57px;
            flex-shrink: 0;
        }

        &__button {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            border-radius: 20px;
            display: grid;
            place-content: center;
            width: 100%;
        }

        &__corner {
            display: block;
            width: 10px;
            height: 10px;
            position: absolute;
            transform: translateX(-100%);
            z-index: 3;
            overflow: hidden;

            &::before {
                content: '';
                display: block;
                width: 200%;
                height: 200%;
                position: absolute;
                top: 0;
                overflow: hidden;
                background: transparent;
                border-radius: 50%;
                box-shadow: 10px 10px 0 0 var(--bg-color-1);
                transform: translate(-50%, -50%);
            }

            &--left {
                left: 0;
                bottom: 0;

                &::before {
                    left: 0;
                }
            }

            &--right {
                right: 0;
                bottom: 0;
                transform: scale(-1, 1) translateX(47px);

                &::before {
                    right: 0;
                    transform: translate(0, -50%);
                }
            }
        }
    }
</style>