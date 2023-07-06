<script lang="ts">
    import {_} from "svelte-i18n";
    import {settings, columns} from "$lib/stores";
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
    let width = column.settings?.width || 'medium';

    $: _settings = {
        timeline: {
            hideRepost: hideRepost,
            hideReply: hideReply,
        },
        langFilterEnabled: langFilterEnabled,
        langFilter: langFilter,
        autoRefresh: autoRefresh,
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
    ];

    function handleClickClose() {
        dispatch('close');
    }
</script>

<div class="deck-settings-wrap">
    <div class="deck-settings">
        <h2 class="deck-settings-title">{$_('deck_settings')}</h2>
        <p class="deck-settings-description">{$_('deck_settings_description')}</p>

        <div class="deck-settings-groups">
            <dl class="settings-group">
                <dt class="settings-group__name">
                    {$_('column_width')}
                </dt>

                <dd class="settings-group__content">
                    <div class="radio-v-group">
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
                            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
                        </svg>

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
                    {$_('hide_repost_frequency')}
                </dt>

                <dd class="settings-group__content">
                    <div class="form-select">
                        <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
                            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
                        </svg>

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
                        <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
                            <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
                        </svg>

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
        </div>
    </div>

    <button class="deck-settings-close" aria-label="Save and close." on:click={handleClickClose}></button>
</div>

<style lang="postcss">
    .deck-settings-wrap {
        position: absolute;
        top: 80px;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100;
        background-color: rgba(0, 0, 0, .5);
        border-radius: 10px;
        padding: 40px;
        overflow: auto;
    }

    .deck-settings {
        padding: 20px;
        background-color: var(--bg-color-1);
        border-radius: 6px;
        position: relative;
        z-index: 1;
        border: 2px solid var(--primary-color);
    }

    .deck-settings-title {
        font-size: 20px;
        margin-bottom: 10px;
        letter-spacing: .025em;
    }

    .deck-settings-description {
        color: var(--text-color-3);
        font-size: 14px;
        margin-bottom: 15px;
    }

    .deck-settings-close {
        display: block;
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        right: 0;
    }
</style>