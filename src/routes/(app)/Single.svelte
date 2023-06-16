<script lang="ts">
    import {
        agent,
        columns,
        currentTimeline,
        settings, userLists, bookmarksStore, timelines, cursors, preferences
    } from '$lib/stores';
    import {_} from "svelte-i18n";
    import TimelineSelector from "./TimelineSelector.svelte";
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";
    import ListModal from "$lib/components/list/ListModal.svelte";
    import BookmarkModal from "$lib/components/bookmark/BookmarkModal.svelte";
    import FeedsModal from "$lib/components/feeds/FeedsModal.svelte";

    let isRefreshing = false;
    let isAlgoNavOpen = false;
    let isListModalOpen = false;
    let listModalId;
    let bookmarks = liveQuery(() => db.bookmarks.toArray());
    let isBookmarkModalOpen = false;
    let isFeedsModalOpen = false;
    let unique = Symbol();
    let refresh;
    let customFeeds = [];

    async function getSavedFeeds() {
        const savedFeeds = $preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')[0]?.saved;

        if (savedFeeds) {
            const res = await $agent.agent.api.app.bsky.feed.getFeedGenerators({feeds: savedFeeds});
            customFeeds = [];
            res.data.feeds.forEach(feed => {
                customFeeds = [...customFeeds, {
                    uri: feed.uri,
                    name: feed.displayName,
                }]
            })
        }
    }

    if (Array.isArray($columns) && !$columns.length) {
        columns.set([
            {
                algorithm: {
                    type: 'default',
                    name: 'HOME'
                },
                style: 'default'
            },
        ]);
    }

    $: {
        if (isAlgoNavOpen) {
            document.body.classList.add('scroll-lock');
        } else {
            document.body.classList.remove('scroll-lock');
        }

        if ($preferences) {
            customFeeds = [];
            getSavedFeeds()
        }
    }

    function handleKeydown(event: { key: string; }) {
        const activeElement = document.activeElement?.tagName;

        if (event.key === 'r' && (activeElement === 'BODY' || activeElement === 'BUTTON') && !isRefreshing) {
            refresh();
        }
    }

    function openAlgoNav(currentAlgo) {
        isAlgoNavOpen = isAlgoNavOpen !== true;
        if (currentAlgo) {
            $columns[$currentTimeline].algorithm = currentAlgo;

            if (!isAlgoNavOpen && $columns[$currentTimeline].algorithm.type !== 'realtime') {
                $timelines[$currentTimeline] = [];
                $cursors[$currentTimeline] = undefined;
                unique = Symbol();
            }
        }
    }

    function listAdd(id = undefined) {
        listModalId = id;
        isListModalOpen = true;
    }

    function bookmarkAdd(bookmark = undefined) {
        isBookmarkModalOpen = true;
        bookmarksStore.set(bookmark);
    }

    function feedAdd() {
        isFeedsModalOpen = true;
    }

    function handleFeedsModalClose(event) {
        isFeedsModalOpen = false;

        if (event.detail.allClose) {
            isAlgoNavOpen = false;
            unique = Symbol();
        }
    }

    function handleBookmarkClose(event) {
        isBookmarkModalOpen = false;

        if (event.detail.clear) {
            $columns[$currentTimeline].algorithm.type = 'default';
            //currentAlgorithm.set({type: 'default'});
            //localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));
            //refresh();
        }
    }

    function handleListRemove(event) {
        if ($columns[$currentTimeline].algorithm.type === 'list' && $columns[$currentTimeline].algorithm.list && event.detail.id === $columns[$currentTimeline].algorithm.list.id) {
            $columns[$currentTimeline].algorithm.type = 'default';
            //currentAlgorithm.set({type: 'default'});
            //localStorage.setItem('currentAlgorithm', JSON.stringify($currentAlgorithm));
        }

        userLists.update(lists => {
            return lists.filter(list => list.id !== event.detail.id);
        });
        localStorage.setItem('lists', JSON.stringify($userLists));

        //refresh();

        isListModalOpen = false;
    }

    function handleListModalClose() {
        location.reload();
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="single-wrap">
  <nav class="home-navs">
    {#if (!$settings.general.disableAlgorithm)}
      <div class="timeline-algo-nav">
        <div class="algo-nav" class:algo-nav--open={isAlgoNavOpen}>
          <div class="algo-nav-bg"></div>

          <ul class="algo-nav-list">
            {#if ($columns[$currentTimeline].algorithm.type === 'custom')}
              <li class="algo-nav-list__item">
                <button
                    class="algo-nav-button algo-nav-button--current"
                    on:click={() => {openAlgoNav(undefined)}}>{$columns[$currentTimeline].algorithm.name}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                  <g id="グループ_89" data-name="グループ 89" transform="translate(-1059 -638)">
                    <rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1059 638)" fill="var(--danger-color)"/>
                    <path id="パス_23" data-name="パス 23" d="M-4.216-12.446v-.781c0-1.385-1.208-2.063-2.859-2.063a4.99,4.99,0,0,0-5.157,5.3A4.893,4.893,0,0,0-7.251-4.961c1.4,0,3.006-.589,3.006-1.975v-.751h-.074a3.975,3.975,0,0,1-2.667.973c-1.9,0-3.212-1.194-3.212-3.566A3.065,3.065,0,0,1-7.06-13.537a3.617,3.617,0,0,1,2.77,1.09Z" transform="translate(1075.028 655.929)" fill="#fff"/>
                  </g>
                </svg></button>
              </li>
            {/if}

            <li class="algo-nav-list__item">
              <button class="algo-nav-button" data-algo-genre="default" data-algo-label="home" class:algo-nav-button--current={$columns[$currentTimeline].algorithm.type === 'default'} on:click={() => {openAlgoNav({type: 'default'})}}>HOME</button>
            </li>

            {#if ($agent.agent.service.host === 'bsky.social')}
              <li class="algo-nav-list__item">
                <button class="algo-nav-button" data-algo-genre="realtime" data-algo-label="home" class:algo-nav-button--current={$columns[$currentTimeline].algorithm.type === 'realtime'} on:click={() => {openAlgoNav({type: 'realtime'})}}>{$_('realtime')}</button>
              </li>
            {/if}

            {#if ($agent.agent.service.host === 'bsky.social')}
              {#each customFeeds as feed}
                <li class="algo-nav-list__item">
                  <button class="algo-nav-button" on:click={() => {openAlgoNav({type: 'custom', algorithm: feed.uri, name: feed.name})}} >{feed.name}<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                    <g id="グループ_89" data-name="グループ 89" transform="translate(-1059 -638)">
                      <rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1059 638)" fill="var(--danger-color)"/>
                      <path id="パス_23" data-name="パス 23" d="M-4.216-12.446v-.781c0-1.385-1.208-2.063-2.859-2.063a4.99,4.99,0,0,0-5.157,5.3A4.893,4.893,0,0,0-7.251-4.961c1.4,0,3.006-.589,3.006-1.975v-.751h-.074a3.975,3.975,0,0,1-2.667.973c-1.9,0-3.212-1.194-3.212-3.566A3.065,3.065,0,0,1-7.06-13.537a3.617,3.617,0,0,1,2.77,1.09Z" transform="translate(1075.028 655.929)" fill="#fff"/>
                    </g>
                  </svg></button>
                </li>
              {/each}
            {/if}

            {#each $userLists as list}
              {#if (list.owner === $agent.did())}
                <li class="algo-nav-list__item">
                  <button class="algo-nav-button" data-algo-genre="list" data-algo-label="{list.name}" on:click={() => {openAlgoNav({type: 'list', list: list})}} class:algo-nav-button--current={$columns[$currentTimeline].algorithm.type === 'list' && $columns[$currentTimeline].algorithm.list.id === list.id}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                    <g id="グループ_100" data-name="グループ 100" transform="translate(-1059 -662)">
                      <rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1059 662)" fill="#2a14b4"/>
                      <path id="パス_26" data-name="パス 26" d="M-.075-1.395v-.7a6.107,6.107,0,0,1-2.145.375h-.525c-1.545,0-1.905-.57-1.905-2.13v-4.92c0-1.02-.435-1.5-1.275-1.5h-.84V-3.72c0,2.46,1.335,3.81,3.75,3.81h.8C-.525.09-.075-.5-.075-1.395Z" transform="translate(1070.42 675.093)" fill="#fff"/>
                    </g>
                  </svg>
                    {list.name}</button>
                  <button class="algo-nav-edit" on:click={() => {listAdd(list.id || undefined)}} aria-label="Edit list"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                    <g id="グループ_99" data-name="グループ 99" transform="translate(-210 -1863)">
                      <circle id="bafkreidwy6swkoyicdm5nypbhyhk7z4o5fe7g5wiyo2255irpb3a6nwffy" cx="12" cy="12" r="12" transform="translate(210 1863)" fill="#b3b3b3"/>
                      <path id="edit-pencil" d="M7.38,2.22l2.4,2.4L2.4,12H0V9.6Zm.84-.84L9.6,0,12,2.4,10.62,3.78Z" transform="translate(216 1869)" fill="#fff"/>
                    </g>
                  </svg></button>
                </li>
              {/if}
            {/each}

            {#if ($bookmarks)}
              {#each $bookmarks as bookmark}
                {#if (bookmark.owner === $agent.did())}
                  <li class="algo-nav-list__item">
                    <button class="algo-nav-button" data-algo-genre="bookmark" data-algo-label="{bookmark.name}" on:click={() => {openAlgoNav({type: 'bookmark', list: String(bookmark.id)})}} class:algo-nav-button--current={$columns[$currentTimeline].algorithm.type === 'bookmark' && $columns[$currentTimeline].algorithm.list === String(bookmark.id)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <g id="グループ_103" data-name="グループ 103" transform="translate(-1082 -686)">
                        <rect id="長方形_76" data-name="長方形 76" width="16" height="16" transform="translate(1082 686)" fill="#94c74c"/>
                        <path id="パス_29" data-name="パス 29" d="M-.615-3.18A2.557,2.557,0,0,0-2.43-5.43,2.117,2.117,0,0,0-.795-7.605c0-1.68-1.4-2.715-3.36-2.715H-5.4a10.581,10.581,0,0,0-2.715.465V-2.4C-8.115-.8-7.17.045-5.25.045h1.11A3.248,3.248,0,0,0-.615-3.18ZM-2.85-7.425c0,.885-.75,1.245-1.665,1.245H-6.09V-8.505a6.435,6.435,0,0,1,.885-.1h.765C-3.675-8.61-2.85-8.325-2.85-7.425Zm.165,4.305c0,.78-.54,1.29-1.65,1.29h-.84c-.51,0-.9-.285-.9-.645V-4.59H-4.44C-3.24-4.59-2.685-4.23-2.685-3.12Z" transform="translate(1094.365 699.138)" fill="#fff"/>
                      </g>
                    </svg>
                      {bookmark.name}</button>
                    <button class="algo-nav-edit" on:click={() => {bookmarkAdd(bookmark || undefined)}} aria-label="Edit list"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                      <g id="グループ_99" data-name="グループ 99" transform="translate(-210 -1863)">
                        <circle id="bafkreidwy6swkoyicdm5nypbhyhk7z4o5fe7g5wiyo2255irpb3a6nwffy" cx="12" cy="12" r="12" transform="translate(210 1863)" fill="#b3b3b3"/>
                        <path id="edit-pencil" d="M7.38,2.22l2.4,2.4L2.4,12H0V9.6Zm.84-.84L9.6,0,12,2.4,10.62,3.78Z" transform="translate(216 1869)" fill="#fff"/>
                      </g>
                    </svg></button>
                  </li>
                {/if}
              {/each}
            {/if}

            <li class="algo-nav-list__item">
              <button class="algo-nav-button algo-nav-button--add algo-nav-button--add-list" on:click={() => {listAdd(undefined)}}>{$_('create_list')}</button>
            </li>

            <li class="algo-nav-list__item">
              <button class="algo-nav-button algo-nav-button--add algo-nav-button--add-bookmark" on:click={() => {bookmarkAdd(undefined)}}>{$_('create_bookmark')}</button>
            </li>

            <li class="algo-nav-list__item">
              <button class="algo-nav-button algo-nav-button--add algo-nav-button--add-feed" on:click={feedAdd}>{$_('open_feed_store')}<svg xmlns="http://www.w3.org/2000/svg" width="19.334" height="18.042" viewBox="0 0 19.334 18.042">
                <g id="storefront-outline" transform="translate(-15.96 -32)">
                  <path id="線_27" data-name="線 27" d="M-15.356-6.335A.644.644,0,0,1-16-6.979v-8.377A.644.644,0,0,1-15.356-16a.644.644,0,0,1,.644.644v8.377A.644.644,0,0,1-15.356-6.335Z" transform="translate(48.715 55.732)" fill="#fff"/>
                  <path id="線_28" data-name="線 28" d="M-15.356-6.335A.644.644,0,0,1-16-6.979v-8.377A.644.644,0,0,1-15.356-16a.644.644,0,0,1,.644.644v8.377A.644.644,0,0,1-15.356-6.335Z" transform="translate(33.251 55.732)" fill="#fff"/>
                  <path id="パス_51" data-name="パス 51" d="M20.534,32H30.72a2.834,2.834,0,0,1,2.6,1.6l1.744,3.807a2.493,2.493,0,0,1-.155,2.388,2.8,2.8,0,0,1-2.311,1.3h-.1a3.007,3.007,0,0,1-2.29-1.031,3.037,3.037,0,0,1-4.57-.01,3.035,3.035,0,0,1-4.586-.011A3.022,3.022,0,0,1,18.76,41.1H18.68a2.808,2.808,0,0,1-2.331-1.3,2.494,2.494,0,0,1-.155-2.39L17.937,33.6A2.834,2.834,0,0,1,20.534,32Zm12.04,7.813a1.507,1.507,0,0,0,1.236-.693,1.224,1.224,0,0,0,.079-1.173l-1.744-3.808a1.544,1.544,0,0,0-1.425-.851H20.534a1.544,1.544,0,0,0-1.425.851l-1.744,3.807a1.225,1.225,0,0,0,.079,1.174,1.514,1.514,0,0,0,1.256.692h.061a1.62,1.62,0,0,0,1.645-1.459.644.644,0,0,1,1.289,0,1.62,1.62,0,0,0,1.646,1.459,1.561,1.561,0,0,0,1.643-1.459.644.644,0,0,1,1.289,0,1.62,1.62,0,0,0,1.645,1.459,1.562,1.562,0,0,0,1.646-1.459.644.644,0,0,1,1.289,0A1.562,1.562,0,0,0,32.5,39.813Z" transform="translate(0)" fill="#fff"/>
                  <path id="線_29" data-name="線 29" d="M2.686-14.711H-15.356A.644.644,0,0,1-16-15.356.644.644,0,0,1-15.356-16H2.686a.644.644,0,0,1,.644.644A.644.644,0,0,1,2.686-14.711Z" transform="translate(31.962 64.753)" fill="#fff"/>
                  <path id="パス_52" data-name="パス 52" d="M97.611,272h3.222a1.613,1.613,0,0,1,1.611,1.611v3.544a.644.644,0,0,1-.644.644H96.644a.644.644,0,0,1-.644-.644v-3.544A1.613,1.613,0,0,1,97.611,272Zm3.544,4.51v-2.9a.323.323,0,0,0-.322-.322H97.611a.323.323,0,0,0-.322.322v2.9Z" transform="translate(-76.816 -230.335)" fill="#fff"/>
                  <path id="パス_53" data-name="パス 53" d="M277.155,280.377a.644.644,0,0,1-.644-.644v-6.121a.322.322,0,0,0-.322-.322h-2.577a.323.323,0,0,0-.322.322v6.121a.644.644,0,1,1-1.289,0v-6.121A1.613,1.613,0,0,1,273.611,272h2.577a1.611,1.611,0,0,1,1.611,1.611v6.121A.644.644,0,0,1,277.155,280.377Z" transform="translate(-245.729 -230.335)" fill="#fff"/>
                </g>
              </svg>
              </button>
            </li>
          </ul>
        </div>
      </div>
    {/if}

    {#if (isListModalOpen)}
      <ListModal id={listModalId} on:close={handleListModalClose} on:remove={handleListRemove}></ListModal>
    {/if}

    {#if (isBookmarkModalOpen)}
      <BookmarkModal bookmark={$bookmarksStore} on:close={handleBookmarkClose}></BookmarkModal>
    {/if}

    {#if (isFeedsModalOpen)}
      <FeedsModal on:close={handleFeedsModalClose}></FeedsModal>
    {/if}
  </nav>

  <div class="single-timeline-wrap">
    {#key $currentTimeline}
      <TimelineSelector column={$columns[$currentTimeline]} index={$currentTimeline} unique={unique} bind:refresh={refresh}></TimelineSelector>
    {/key}
  </div>
</div>

<style lang="postcss">
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