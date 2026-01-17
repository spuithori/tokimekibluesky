<script lang="ts">
    import {_} from "svelte-i18n";
    import { currentTimeline, settings } from "$lib/stores";
    import { languageMap } from "$lib/langs/languageMap";
    import RealtimeFollows from "$lib/components/realtime/RealtimeFollows.svelte";
    import {backgroundsMap} from "$lib/columnBackgrounds";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {Search} from "lucide-svelte";
    import { fly } from 'svelte/transition';
    import Notice from "$lib/components/ui/Notice.svelte";

    interface Props {
        index: any;
        _agent: any;
        layout?: string;
        onclose: (refreshed?: boolean) => void;
    }

    let {
        index,
        _agent,
        layout = 'default',
        onclose,
    }: Props = $props();

    const columnState = getColumnState();
    let column = columnState.getColumn(index);

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

    const widthSettings = [
        {
            name: $_('width_xxs'),
            value: 'xxs',
        },
        {
            name: $_('width_xs'),
            value: 'xs',
        },
        {
            name: $_('width_small'),
            value: 'small',
        },
        {
            name: $_('width_medium'),
            value: 'medium',
        },
        {
            name: $_('width_large'),
            value: 'large',
        },
        {
            name: $_('width_xl'),
            value: 'xl',
        },
        {
            name: $_('width_xxl'),
            value: 'xxl',
        },
    ];

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
        if ($currentTimeline === index) {
            currentTimeline.set(0);
        }
        columnState.remove(column.id);
    }

    function clearColumn() {
        column.data.feed = [];
        column.data.cursor = '';

        if (column.algorithm.type === 'notification') {
            column.data.feedPool = [];
            column.data.notificationGroup = [];
        }
        onclose(true);
    }

    function popupColumn() {
        if (column.settings.isPopup) {
            column.settings = {...column.settings, isPopup: false};
        } else {
            column.settings = {...column.settings, isPopup: true};
        }
    }

    function handleSearchChange() {
        column.algorithm.name = `${$_('search')} "${column.algorithm.algorithm}"`;
        column.data.feed = [];
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
</script>

<div class="deck-settings-wrap deck-settings-wrap--{layout}" in:fly={{duration: 250, opacity: 0, y: -8}}>
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

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('column_style')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="timeline-style-nav">
                                <div class="style-nav" data-current="{column.style}">
                                    <div class="style-nav__item style-nav__item--active style-nav__item--default">
                                        <button aria-label="Default Timeline" class="style-nav__button" onclick={() => {toggleStyle('default')}}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu-icon lucide-menu"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>
                                        </button>
                                    </div>

                                    <div class="style-nav__item style-nav__item--media">
                                        <button aria-label="Media Timeline" class="style-nav__button" onclick={() => {toggleStyle('media')}}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-icon lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
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

                {#if (!column.settings?.isPopup)}
                    <dl class="settings-group only-pc">
                        <dt class="settings-group__name">
                            {$_('column_width')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="radio-v-group radio-v-group--dwidth">
                                {#each widthSettings as option}
                                    {#if ($settings.design?.layout === 'decks')}
                                        <div class="radio-v-group__item">
                                            <input type="radio" id={column.id + option.value} bind:group={column.settings.width} name="{column.id}_width" value={option.value}><label for={column.id + option.value}>{option.name}</label>
                                        </div>
                                    {:else}
                                        <div class="radio-v-group__item">
                                            <input type="radio" id={column.id + option.value} bind:group={$settings.design.singleWidth} name="{column.id}_width" value={option.value}><label for={column.id + option.value}>{option.name}</label>
                                        </div>
                                    {/if}
                                {/each}
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList')}
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

                {#if column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList' && column.algorithm?.type !== 'notification'}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('auto_refresh')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

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

                <dl class="settings-group">
                    <dt class="settings-group__name">
                        {$_('play_se')}
                    </dt>

                    <dd class="settings-group__content">
                        <div class="form-select">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

                            <select class="form-select__select" bind:value={column.settings.playSound}>
                                {#each playSoundSettings as option}
                                    <option value="{option.value}">{option.name}</option>
                                {/each}
                            </select>
                        </div>
                    </dd>
                </dl>

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

                {#if (column.algorithm?.type === 'chat')}
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

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList')}
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

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread' && column.algorithm?.type !== 'search' && column.algorithm?.type !== 'chat' && column.algorithm?.type !== 'chatList')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_repost_frequency')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

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
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

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
                    <a class="deck-column-delete-button deck-column-delete-button--info" href="/profile/{column.algorithm.algorithm.split('/')[2]}/feed/{column.algorithm.algorithm.split('/').slice(-1)[0]}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--link-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>{$_('column_feed_info')}
                    </a>
                {/if}

                {#if (column.algorithm?.type === 'officialList')}
                    <a class="deck-column-delete-button deck-column-delete-button--info" href="/profile/{column.algorithm.algorithm.split('/')[2]}/lists/{column.algorithm.algorithm.split('/').slice(-1)[0]}"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--link-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>{$_('column_list_info')}
                    </a>
                {/if}

                {#if ($settings.design?.layout === 'decks')}
                    <button class="deck-column-delete-button deck-column-delete-button--popup only-pc" onclick={popupColumn}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-picture-in-picture-2"><path d="M21 9V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h4"/><rect width="10" height="7" x="12" y="13" rx="2"/></svg>{$_('popup_column')}
                    </button>
                {/if}

                <button class="deck-column-delete-button deck-column-delete-button--clear" onclick={clearColumn}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eraser"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>{$_('clear_column_posts')}</button>

                <button class="deck-column-delete-button" onclick={deleteColumn}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>{$_('delete_column')}</button>
            </div>
        </div>
    </div>
</div>

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
    }
</style>