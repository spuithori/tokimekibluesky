<script lang="ts">
    import Menu from '@lucide/svelte/icons/menu';
    import Image from '@lucide/svelte/icons/image';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import Info from '@lucide/svelte/icons/info';
    import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2';
    import Eraser from '@lucide/svelte/icons/eraser';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import {_} from "svelte-i18n";
    import { currentTimeline, settings } from "$lib/stores";
    import { languageMap } from "$lib/langs/languageMap";
    import RealtimeFollows from "$lib/components/realtime/RealtimeFollows.svelte";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {isContentColumn} from "$lib/columnKinds";
    import {animateLayout} from "$lib/animations/flip";
    import {
        resolveDeckWidthPx, resolveSingleWidthPx, clampDeckWidth, clampSingleWidth,
        DECK_WIDTH_MIN, DECK_WIDTH_MAX, DECK_WIDTH_DEFAULT,
        SINGLE_WIDTH_MIN, SINGLE_WIDTH_MAX, SINGLE_WIDTH_DEFAULT,
    } from "$lib/deckWidth";
    import Search from '@lucide/svelte/icons/search';
    import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
    import Unlink from '@lucide/svelte/icons/unlink';
    import { fly } from 'svelte/transition';
    import Notice from "$lib/components/ui/Notice.svelte";

    interface Props {
        index: any;
        _agent: any;
        layout?: string;
        onclose: (refreshed?: boolean) => void;
        isSplit?: boolean;
        column?: any;
    }

    let {
        index,
        _agent,
        layout = 'default',
        onclose,
        isSplit = false,
        column: columnProp = undefined,
    }: Props = $props();

    const columnState = getColumnState();
    let column = columnProp ?? columnState.getColumn(index);
    let slotIndex = columnState.slotIndexOf(column.id);

    const defaultSettings = {
        timeline: {
            hideRepost: null,
            hideReply: null,
            hideMention: null,
            hideQuote: null,
            simpleReply: null,
        },
        langFilterEnabled: false,
        langFilter: [],
        autoRefresh: 0,
        refreshToTop: false,
        autoScroll: false,
        autoScrollSpeed: 'auto',
        width: 'medium',
        icon: null,
        onlyShowUnread: false,
        playSound: null,
        hideCounts: false,
        isPopup: false,
        popupPosition: {
            x: 0,
            y: 0,
            width: 280,
            height: 400,
        },
        opacity: 100,
        background: '',
        showReactionViaRepost: false,
        mediaColumns: 3,
    };
    column.settings = {...defaultSettings, ...column.settings};

    const playSoundSettings = [
        {
            name: $_('play_sound_nothing'),
            value: null,
        },
        {
            name: 'Pirorin',
            value: 'sound1',
        },
        {
            name: 'Pirorin2',
            value: 'sound2',
        },
        {
            name: 'Pirorin3',
            value: 'sound3',
        },
        {
            name: 'Tettere',
            value: 'sound4',
        },
        {
            name: 'DoDon',
            value: 'sound5',
        },
        {
            name: 'Notification1',
            value: 'notification1',
        },
        {
            name: 'Notification2',
            value: 'notification2',
        },
        {
            name: 'Notification3',
            value: 'notification3',
        },
    ]

    const replySettings = [
        {
            name: $_('settings_inherit'),
            value: null,
        },
        {
            name: $_('reply_settings_all'),
            value: 'all',
        },
        {
            name: $_('reply_settings_following'),
            value: 'following',
        },
        {
            name: $_('reply_settings_me'),
            value: 'me',
        }
    ];

    const repostSettings = [
        {
            name: $_('settings_inherit'),
            value: null,
        },
        {
            name: $_('repost_settings_all'),
            value: 'all',
        },
        {
            name: $_('repost_settings_many'),
            value: 'many',
        },
        {
            name: $_('repost_settings_soso'),
            value: 'soso',
        },
        {
            name: $_('repost_settings_less'),
            value: 'less',
        },
        {
            name: $_('repost_settings_none'),
            value: 'none',
        }
    ];

    const autoRefreshSettings = [
        {
            name: $_('auto_refresh_nothing'),
            value: 0,
        },
        {
            name: $_('auto_refresh_10s'),
            value: 10,
        },
        {
            name: $_('auto_refresh_30s'),
            value: 30,
        },
        {
            name: $_('auto_refresh_60s'),
            value: 60,
        },
        {
            name: $_('auto_refresh_5m'),
            value: 300,
        },
        {
            name: $_('auto_refresh_10m'),
            value: 600,
        },
        {
            name: $_('auto_refresh_30m'),
            value: 1800,
        },
    ];

    if (column.algorithm?.type === 'default' || column.algorithm?.type === 'officialList') {
        autoRefreshSettings.push({
            name: $_('auto_refresh_realtime'),
            value: -1,
        })
    }

    const isDecksLayout = $derived($settings.design?.layout === 'decks');
    const widthMin = $derived(isDecksLayout ? DECK_WIDTH_MIN : SINGLE_WIDTH_MIN);
    const widthMax = $derived(isDecksLayout ? DECK_WIDTH_MAX : SINGLE_WIDTH_MAX);
    const widthDefault = $derived(isDecksLayout ? DECK_WIDTH_DEFAULT : SINGLE_WIDTH_DEFAULT);
    const currentWidthPx = $derived(isDecksLayout
        ? resolveDeckWidthPx(column.settings?.width)
        : resolveSingleWidthPx($settings.design?.singleWidth));

    function setWidth(px: number) {
        if (isDecksLayout) {
            column.settings.width = clampDeckWidth(px);
        } else {
            $settings.design.singleWidth = clampSingleWidth(px);
        }
    }

    const autoScrollSpeedSettings = [
        {
            name: $_('auto_scroll_speed_slow'),
            value: 'slow',
        },
        {
            name: $_('auto_scroll_speed_normal'),
            value: 'normal',
        },
        {
            name: $_('auto_scroll_speed_fast'),
            value: 'fast',
        },
        {
            name: $_('auto_scroll_speed_faster'),
            value: 'faster',
        },
    ];

    function toggleStyle(style: 'default' | 'media') {
        column.style = style;
    }

    function deleteColumn() {
        if (isSplit) {
            animateLayout(() => columnState.unsplitColumnAt(column.id, false), {exiting: [column.id]});
            onclose(true);
            return;
        }
        if ($currentTimeline === slotIndex) {
            currentTimeline.set(0);
        }
        animateLayout(() => columnState.remove(column.id), {exiting: [column.id]});
    }

    function clearColumn() {
        columnState.clearFeed(column.id);
        column.data.cursor = '';

        if (column.algorithm.type === 'notification') {
            column.data.feedPool = [];
            column.data.notificationGroup = [];
        }
        onclose(true);
    }

    function popupColumn() {
        animateLayout(() => {
            column.settings = {...column.settings, isPopup: !column.settings.isPopup};
        });
    }

    function handleSearchChange() {
        column.algorithm.name = `${$_('search')} "${column.algorithm.algorithm}"`;
        columnState.clearFeed(column.id);
        column.data.cursor = '';
    }

    function handleViaRepostChange() {
        if (column.filter.includes('like-via-repost')) {
            column.filter = column.filter.filter(item => item !== 'like-via-repost');
        } else {
            column.filter.push('like-via-repost');
        }

        if (column.filter.includes('repost-via-repost')) {
            column.filter = column.filter.filter(item => item !== 'repost-via-repost');
        } else {
            column.filter.push('repost-via-repost');
        }

        onclose(true);
    }

    let isUnsplitConfirmOpen = $state(false);

    function handleSwapSplit() {
        animateLayout(() => columnState.swapSplitColumn(column.id));
        onclose(true);
    }

    function handleUnsplit(keepAsSeparate: boolean) {
        animateLayout(() => columnState.unsplitColumnAt(column.id, keepAsSeparate), keepAsSeparate ? {} : {exiting: [column.id]});
        isUnsplitConfirmOpen = false;
        onclose(true);
    }
</script>

<div class="deck-settings-wrap deck-settings-wrap--{layout}" class:deck-settings-wrap--split={isSplit} in:fly={{duration: 250, opacity: 0, y: -8}}>
    <div class="deck-settings">
        <div class="deck-settings-content">
            <p class="deck-settings-description">{$_('deck_settings_description')}</p>

            <div class="deck-settings-groups">
                {#if (column.algorithm?.type === 'search')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('/search_search')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-text input-text--icon">
                                <Search size="20" color="var(--text-color-1)"></Search>
                                <input class="input-text__input" type="text" bind:value={column.algorithm.algorithm} onchange={handleSearchChange}>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && column.algorithm?.type !== 'mochottTimeline' && column.algorithm?.type !== 'networkFeed' && !isContentColumn(column.algorithm?.type))}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('column_style')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="timeline-style-nav">
                                <div class="style-nav" data-current="{column.style}">
                                    <div class="style-nav__item style-nav__item--active style-nav__item--default">
                                        <button aria-label="Default Timeline" class="style-nav__button" onclick={() => {toggleStyle('default')}}>
                                            <Menu size={20} color="var(--text-color-1)" />
                                        </button>
                                    </div>

                                    <div class="style-nav__item style-nav__item--media">
                                        <button aria-label="Media Timeline" class="style-nav__button" onclick={() => {toggleStyle('media')}}>
                                            <Image size={20} color="var(--text-color-1)" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if column.style === 'media'}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('media_column_columns')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="radio-v-group">
                                <div class="radio-v-group__item">
                                    <input type="radio" id={column.id + 'media_columns_1'} bind:group={column.settings.mediaColumns} name="{column.id}_media_columns" value={1}><label for={column.id + 'media_columns_1'}>1</label>
                                </div>

                                <div class="radio-v-group__item">
                                    <input type="radio" id={column.id + 'media_columns_2'} bind:group={column.settings.mediaColumns} name="{column.id}_media_columns" value={2}><label for={column.id + 'media_columns_2'}>2</label>
                                </div>

                                <div class="radio-v-group__item">
                                    <input type="radio" id={column.id + 'media_columns_3'} bind:group={column.settings.mediaColumns} name="{column.id}_media_columns" value={3}><label for={column.id + 'media_columns_3'}>3</label>
                                </div>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (!column.settings?.isPopup && (!isSplit || columnState.isInSplit(column.id)))}
                    <dl class="settings-group only-pc">
                        <dt class="settings-group__name">
                            {$_('column_width')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="column-width-control">
                                <input
                                    class="column-width-control__range"
                                    type="range"
                                    min={widthMin}
                                    max={widthMax}
                                    step="10"
                                    value={currentWidthPx}
                                    oninput={(e) => setWidth(+e.currentTarget.value)}
                                    aria-label={$_('column_width')}
                                >
                                <div class="column-width-control__row">
                                    <input
                                        class="column-width-control__number"
                                        type="number"
                                        min={widthMin}
                                        max={widthMax}
                                        step="10"
                                        value={currentWidthPx}
                                        onchange={(e) => setWidth(+e.currentTarget.value)}
                                    >
                                    <span class="column-width-control__unit">px</span>
                                    <button type="button" class="column-width-control__reset" onclick={() => setWidth(widthDefault)}>
                                        {$_('column_width_reset')}
                                    </button>
                                </div>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && column.algorithm?.type !== 'mochottTimeline' && column.algorithm?.type !== 'networkFeed' && !isContentColumn(column.algorithm?.type))}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('refresh_to_top')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'refreshToTop'} bind:checked={column.settings.refreshToTop}><label class="input-toggle__label" for={column.id + 'refreshToTop'}></label>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && column.algorithm?.type !== 'notification' && !isContentColumn(column.algorithm?.type)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('auto_refresh')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <ChevronDown size={20} color="var(--primary-color)" />

                                <select class="form-select__select" bind:value={column.settings.autoRefresh}>
                                    {#each autoRefreshSettings as option}
                                        <option value="{option.value}">{option.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </dd>
                    </dl>

                    {#if (column.settings.autoRefresh === -1)}
                        <Notice text={$_('auto_refresh_realtime_notice')}></Notice>

                        {#if (column.algorithm.type === 'default')}
                            <RealtimeFollows {_agent}></RealtimeFollows>
                        {/if}
                    {/if}
                {/if}

                {#if !isContentColumn(column.algorithm?.type)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('play_se')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <ChevronDown size={20} color="var(--primary-color)" />

                                <select class="form-select__select" bind:value={column.settings.playSound}>
                                    {#each playSoundSettings as option}
                                        <option value="{option.value}">{option.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.settings?.isPopup)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('column_opacity')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="range">
                                <input class="range__input" type="range" min="60" max="100" step="1" bind:value={column.settings.opacity}>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type === 'chat' && !isSplit)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('column_background')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="icons-radio-group icons-radio-group--grid icons-radio-group--bg">
                                {#each backgroundsMap as [key, value]}
                                    <div class="icons-radio icons-radio--skin">
                                        <input type="radio" bind:group={column.settings.background} id="bg_{key}" name="skin" value={key}>
                                        <label for="bg_{key}">
                                    <span class="icons-radio__ui">
                                        {#if value.url}
                                            <img src="{value.url}" alt="">
                                        {/if}
                                    </span>
                                        </label>
                                    </div>
                                {/each}
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && !isContentColumn(column.algorithm?.type))}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('auto_scroll')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'autoScroll'} bind:checked={column.settings.autoScroll}><label class="input-toggle__label" for={column.id + 'autoScroll'}></label>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.settings.autoScroll)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('auto_scroll_speed')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="radio-v-group radio-v-group--4columns">
                                {#each autoScrollSpeedSettings as option}
                                    <div class="radio-v-group__item">
                                        <input type="radio" id={column.id + option.value} bind:group={column.settings.autoScrollSpeed} name="{column.id}_autoscroll" value={option.value}><label for={column.id + option.value}>{option.name}</label>
                                    </div>
                                {/each}
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type === 'notification')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('show_reaction_via_repost')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'showReactionViaRepost'} bind:checked={() => column.filter.includes('like-via-repost'), () => {}} onchange={handleViaRepostChange}><label class="input-toggle__label" for={column.id + 'showReactionViaRepost'}></label>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('only_show_unread')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'onlyShowUnread'} bind:checked={column.settings.onlyShowUnread} onchange={() => {onclose(true)}}><label class="input-toggle__label" for={column.id + 'onlyShowUnread'}></label>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_notification_counts')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'hideNotificationCounts'} bind:checked={column.settings.hideCounts}><label class="input-toggle__label" for={column.id + 'hideNotificationCounts'}></label>
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && column.algorithm?.type !== 'mochottTimeline' && column.algorithm?.type !== 'networkFeed' && !isContentColumn(column.algorithm?.type))}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_repost_frequency')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <ChevronDown size={20} color="var(--primary-color)" />

                                <select class="form-select__select" bind:value={column.settings.timeline.hideRepost}>
                                    {#each repostSettings as option}
                                        <option value="{option.value}">{option.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_reply_frequency')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <ChevronDown size={20} color="var(--primary-color)" />

                                <select class="form-select__select" bind:value={column.settings.timeline.hideReply}>
                                    {#each replySettings as option}
                                        <option value="{option.value}">{option.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_quote')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'hideQuote'} bind:checked={column.settings.timeline.hideQuote}><label class="input-toggle__label" for={column.id + 'hideQuote'}></label>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('simple_reply')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'simpleReply'} bind:checked={column.settings.timeline.simpleReply}><label class="input-toggle__label" for={column.id + 'simpleReply'}></label>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('lang_filter_overwritten')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'langFilterEnabled'} bind:checked={column.settings.langFilterEnabled}><label class="input-toggle__label" for={column.id + 'langFilterEnabled'}></label>
                            </div>
                        </dd>
                    </dl>

                    {#if column.settings.langFilterEnabled}
                        <div class="lang-filter-wrap">
                            <Notice text={$_('lang_filter_notice')}></Notice>

                            <div class="lang-filter-list">
                                {#each languageMap as [k, v]}
                                    <div class="lang-filter-list__item">
                                        <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

                                        <div class="input-toggle">
                                            <input class="input-toggle__input" type="checkbox" id={k}
                                                   value={k} name="Languages" bind:group={column.settings.langFilter}><label class="input-toggle__label" for={k}></label>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}

                {#if (column.algorithm?.type === 'custom')}
                    <a class="deck-column-delete-button deck-column-delete-button--info" href="/profile/{column.algorithm.algorithm.split('/')[2]}/feed/{column.algorithm.algorithm.split('/').slice(-1)[0]}"><Info size={20} color="var(--link-color)" />{$_('column_feed_info')}
                    </a>
                {/if}

                {#if (column.algorithm?.type === 'officialList')}
                    <a class="deck-column-delete-button deck-column-delete-button--info" href="/profile/{column.algorithm.algorithm.split('/')[2]}/lists/{column.algorithm.algorithm.split('/').slice(-1)[0]}"><Info size={20} color="var(--link-color)" />{$_('column_list_info')}
                    </a>
                {/if}

                {#if ($settings.design?.layout === 'decks')}
                    <button class="deck-column-delete-button deck-column-delete-button--popup only-pc" onclick={popupColumn}>
                        <PictureInPicture2 size={20} color="var(--primary-color)" />{$_('popup_column')}
                    </button>
                {/if}

                {#if ($settings.design?.layout === 'decks' && !column.settings?.isPopup)}
                    {#if columnState.isInSplit(column.id)}
                        <button class="deck-column-delete-button deck-column-delete-button--split only-pc" onclick={handleSwapSplit}>
                            <ArrowUpDown size="20" color="var(--primary-color)"></ArrowUpDown>{$_('swap_split')}
                        </button>
                        <button class="deck-column-delete-button deck-column-delete-button--split only-pc" onclick={() => {isUnsplitConfirmOpen = true}}>
                            <Unlink size="20" color="var(--primary-color)"></Unlink>{$_('unsplit_column')}
                        </button>
                    {/if}
                {/if}

                {#if !isContentColumn(column.algorithm?.type)}
                    <button class="deck-column-delete-button deck-column-delete-button--clear" onclick={clearColumn}>
                        <Eraser size={20} color="var(--text-color-3)" />{$_('clear_column_posts')}</button>
                {/if}

                <button class="deck-column-delete-button" onclick={deleteColumn}><Trash2 size={20} color="var(--danger-color)" />{$_('delete_column')}</button>
            </div>
        </div>
    </div>

</div>

{#if isUnsplitConfirmOpen}
    <div class="split-modal-overlay" onclick={() => {isUnsplitConfirmOpen = false}}>
        <div class="split-modal split-modal--confirm" onclick={(e) => e.stopPropagation()} transition:fly={{duration: 200, y: 20}}>
            <div class="split-modal__header">
                <h3 class="split-modal__title">{$_('unsplit_column')}</h3>
                <button class="split-modal__close" onclick={() => {isUnsplitConfirmOpen = false}}>×</button>
            </div>
            <div class="split-modal__content split-modal__content--confirm">
                <button class="split-modal__option" onclick={() => handleUnsplit(true)}>
                    <span class="split-modal__option-text">{$_('split_keep_as_column')}</span>
                </button>
                <button class="split-modal__option split-modal__option--danger" onclick={() => handleUnsplit(false)}>
                    <span class="split-modal__option-text">{$_('split_delete')}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<style lang="postcss">
    .deck-settings-wrap {
        position: absolute;
        top: 52px;
        left: 0;
        right: -6px;
        height: calc(100dvh - 52px - var(--decks-margin));
        padding: 0;
        z-index: 100;
        background-color: var(--bg-color-1);
        overflow: hidden;

        @media (max-width: 767px) {
            height: calc(100dvh - 64px - 90px - var(--safe-area-bottom));
        }

        &--split {
            top: 48px;
            right: 0;
            bottom: 0;
            height: auto;
        }
    }

    .deck-settings {
        position: relative;
        z-index: 1;
        overflow-x: hidden;
        height: 100%;
        overscroll-behavior-y: contain;

        @supports (-moz-appearance: none) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
            scrollbar-width: thin;
        }

        &::-webkit-scrollbar {
            width: 6px;
        }

        &::-webkit-scrollbar-thumb {
            background: var(--scroll-bar-color);
        }

        &::-webkit-scrollbar-track {
            background: var(--scroll-bar-bg-color);
        }
    }

    .deck-settings-description {
        color: var(--text-color-3);
        font-size: 14px;
    }

    .style-nav {
        width: 114px;
        border-radius: 8px;
        height: 36px;
        display: flex;
        position: relative;
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-2);

        @media (max-width: 767px) {
            margin-left: 0;
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
            border-radius: 8px 8px;
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
    }

    .deck-settings-content {
        padding: 16px 12px;
        min-height: calc(100% + 1px);
    }

    .deck-column-delete-button {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 16px;
        color: var(--danger-color);
        text-align: left;

        &:hover {
            text-decoration: underline;
        }

        &--clear {
            color: var(--text-color-3);
        }

        &--popup {
            color: var(--primary-color);
        }

        &--info {
            color: var(--link-color);
        }

        &--split {
            color: var(--primary-color);
        }
    }

    .split-modal-overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 16px;
        height: 100vh;
    }

    .split-modal {
        background-color: var(--bg-color-1);
        border-radius: var(--border-radius-5);
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 100%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;

        &--confirm {
            max-width: 320px;
        }

        &__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px;
        }

        &__title {
            font-size: 16px;
            font-weight: bold;
            margin: 0;
        }

        &__close {
            width: 32px;
            height: 32px;
            display: grid;
            place-content: center;
            font-size: 24px;
            color: var(--text-color-3);
            border-radius: var(--border-radius-2);

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__content {
            padding: 16px;
            overflow-y: auto;
            flex: 1;

            &--confirm {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
        }

        &__option {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 16px;
            border-radius: var(--border-radius-2);
            background-color: var(--bg-color-2);
            text-align: center;
            font-size: 14px;
            transition: background-color 0.15s ease;
            color: var(--text-color-1);

            &:hover {
                background-color: var(--bg-color-3);
            }

            &--danger {
                color: var(--danger-color);
            }
        }

        &__option-text {
            font-weight: 500;
        }
    }

    .column-width-control {
        display: flex;
        flex-direction: column;
        gap: 10px;

        &__range {
            width: 100%;
            accent-color: var(--primary-color);
            cursor: ew-resize;
        }

        &__row {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        &__number {
            width: 84px;
            height: 34px;
            padding: 0 8px;
            border-radius: var(--border-radius-2, 6px);
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-1);
            color: var(--text-color-1);
            font-size: 14px;
        }

        &__unit {
            color: var(--text-color-3);
            font-size: 14px;
        }

        &__reset {
            margin-left: auto;
            height: 34px;
            padding: 0 12px;
            border-radius: var(--border-radius-2, 6px);
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            color: var(--text-color-2);
            font-size: 13px;
            cursor: pointer;
        }
    }
</style>