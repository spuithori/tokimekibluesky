<script lang="ts">
    import {_} from "svelte-i18n";
    import {settings, columns, singleColumn, timelines, cursors} from "$lib/stores";
    import { languageMap } from "$lib/langs/languageMap";
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher();
    export let column;
    export let index;

    let hideRepost = column.settings?.timeline.hideRepost || null;
    let hideReply = column.settings?.timeline.hideReply || null;
    let langFilterEnabled = column.settings?.langFilterEnabled || false;
    let langFilter = column.settings?.langFilter || [];
    let autoRefresh = column.settings?.autoRefresh || 0;
    let autoScroll = column.settings?.autoScroll || false;
    let autoScrollSpeed = column.settings?.autoScrollSpeed || 'normal';
    let width = column.settings?.width || 'medium';

    $: _settings = {
        timeline: {
            hideRepost: hideRepost,
            hideReply: hideReply,
        },
        langFilterEnabled: langFilterEnabled,
        langFilter: langFilter,
        autoRefresh: autoRefresh,
        autoScroll: autoScroll,
        autoScrollSpeed: autoScrollSpeed,
        width: width,
    }

    $: apply(_settings);

    function apply(settings) {
        $columns[index] = { ...$columns[index], settings: settings }
    }

    if (!$columns[index].settings) {
        $columns[index].settings = {
            timeline: {
                hideRepost: null,
                hideReply: null,
            },
            langFilterEnabled: false,
            langFilter: [],
            autoRefresh: 0,
            autoScroll: false,
            autoScrollSpeed: 'auto',
        }
    }

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
    ];

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
        /* {
            name: $_('auto_scroll_speed_auto'),
            value: 'auto',
        }, */
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

    function handleClickClose() {
        dispatch('close');
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
        }
    }
</script>

<div class="deck-settings-wrap">
    <div class="deck-settings">
        <div class="column-heading">
            <h2 class="column-heading__title">{$_('deck_settings')}</h2>

            <div class="column-heading__buttons column-heading__buttons--right">
                <button class="column-heading-button" aria-label="Save and close." on:click={handleClickClose}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
            </div>
        </div>

        <div class="deck-settings-content">
            <p class="deck-settings-description">{$_('deck_settings_description')}</p>

            <div class="deck-settings-groups">
                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('column_style')}
                        </dt>

                        <dd class="settings-group__content">
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
                                </div>
                            </div>
                        </dd>
                    </dl>
                {/if}

                <dl class="settings-group">
                    <dt class="settings-group__name">
                        {$_('column_width')}
                    </dt>

                    <dd class="settings-group__content">
                        <div class="radio-v-group radio-v-group--dwidth">
                            {#each widthSettings as option}
                                <div class="radio-v-group__item">
                                    <input type="radio" id={column.id + option.value} bind:group={width} name="{column.id}_width" value={option.value}><label for={column.id + option.value}>{option.name}</label>
                                </div>
                            {/each}
                        </div>
                    </dd>
                </dl>

                <dl class="settings-group">
                    <dt class="settings-group__name">
                        {$_('auto_refresh')}
                    </dt>

                    <dd class="settings-group__content">
                        <div class="form-select">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

                            <select class="form-select__select" bind:value={autoRefresh}>
                                {#each autoRefreshSettings as option}
                                    <option value="{option.value}">{option.name}</option>
                                {/each}
                            </select>
                        </div>
                    </dd>
                </dl>

                <dl class="settings-group">
                    <dt class="settings-group__name">
                        {$_('auto_scroll')}
                    </dt>

                    <dd class="settings-group__content">
                        <div class="input-toggle">
                            <input class="input-toggle__input" type="checkbox" id={column.id + 'autoScroll'} bind:checked={autoScroll}><label class="input-toggle__label" for={column.id + 'autoScroll'}></label>
                        </div>
                    </dd>
                </dl>

                {#if (autoScroll)}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('auto_scroll_speed')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="radio-v-group radio-v-group--4columns">
                                {#each autoScrollSpeedSettings as option}
                                    <div class="radio-v-group__item">
                                        <input type="radio" id={column.id + option.value} bind:group={autoScrollSpeed} name="{column.id}_width" value={option.value}><label for={column.id + option.value}>{option.name}</label>
                                    </div>
                                {/each}
                            </div>
                        </dd>
                    </dl>
                {/if}

                {#if (column.algorithm?.type !== 'notification' && column.algorithm?.type !== 'thread')}
                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('hide_repost_frequency')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="form-select">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>

                                <select class="form-select__select" bind:value={hideRepost}>
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

                                <select class="form-select__select" bind:value={hideReply}>
                                    {#each replySettings as option}
                                        <option value="{option.value}">{option.name}</option>
                                    {/each}
                                </select>
                            </div>
                        </dd>
                    </dl>

                    <dl class="settings-group">
                        <dt class="settings-group__name">
                            {$_('lang_filter_overwritten')}
                        </dt>

                        <dd class="settings-group__content">
                            <div class="input-toggle">
                                <input class="input-toggle__input" type="checkbox" id={column.id + 'langFilterEnabled'} bind:checked={langFilterEnabled}><label class="input-toggle__label" for={column.id + 'langFilterEnabled'}></label>
                            </div>
                        </dd>
                    </dl>

                    {#if langFilterEnabled}
                        <div class="lang-filter-wrap">
                            <div class="lang-filter-list">
                                {#each languageMap as [k, v]}
                                    <div class="lang-filter-list__item">
                                        <p class="lang-filter-list__name"><label for={k}>{$_(v.name)}</label></p>

                                        <div class="input-toggle">
                                            <input class="input-toggle__input" type="checkbox" id={k}
                                                   value={k} name="Languages" bind:group={langFilter}><label class="input-toggle__label" for={k}></label>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </div>
</div>

<style lang="postcss">
    .deck-settings-wrap {
        position: relative;
        top: -52px;
        background-color: var(--bg-color-1);
        border-radius: 10px;
        padding: 0;
        z-index: 100;
        height: 100%;
        overflow-y: auto;
    }

    .deck-settings {
        position: relative;
        z-index: 1;
    }

    .deck-settings-description {
        color: var(--text-color-3);
        font-size: 14px;
        margin-bottom: 15px;
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
        padding: 16px;
    }
</style>