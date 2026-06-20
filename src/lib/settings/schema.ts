import { Sparkle } from 'lucide-svelte';
import type { SettingItem } from './schema.types';

/**
 * Single source of truth for data-driven settings rendering and search.
 * Written `as const satisfies readonly SettingItem[]` so option/key literals
 * are preserved while each `key` is validated against the canonical Settings
 * type (a rename on either side is a compile error). Complex UIs are referenced
 * via `type: 'custom'`; categories are migrated incrementally.
 */
const rawSettingsSchema = [
    // --- embed (rendered on the design/embed page) ---
    { key: 'embed.youtube', category: 'embed', scope: 'global', type: 'toggle', label: 'embed_youtube', default: true },
    { key: 'embed.x', category: 'embed', scope: 'global', type: 'toggle', label: 'embed_x', default: true },
    { key: 'embed.spotify', category: 'embed', scope: 'global', type: 'toggle', label: 'embed_spotify', default: false },
    { key: 'embed.bluemotion', category: 'embed', scope: 'global', type: 'toggle', label: 'embed_bluemotion', default: true },
    { key: 'embed.giphy', category: 'embed', scope: 'global', type: 'toggle', label: 'GIPHY', literalLabel: true, default: true },
    { key: 'embed.tenor', category: 'embed', scope: 'global', type: 'toggle', label: 'Tenor', literalLabel: true, default: true },
    { key: 'embed.klipy', category: 'embed', scope: 'global', type: 'toggle', label: 'KLIPY', literalLabel: true, default: true },

    // --- timeline ---
    {
        key: 'timeline.hideRepost', category: 'timeline', scope: 'global', type: 'select', fullwidth: true,
        label: 'hide_repost_frequency', default: 'all',
        options: [
            { value: 'all', label: 'repost_settings_all' },
            { value: 'many', label: 'repost_settings_many' },
            { value: 'soso', label: 'repost_settings_soso' },
            { value: 'less', label: 'repost_settings_less' },
            { value: 'none', label: 'repost_settings_none' },
        ],
    },
    {
        key: 'timeline.hideReply', category: 'timeline', scope: 'global', type: 'select', fullwidth: true,
        label: 'hide_reply_frequency', default: 'all',
        options: [
            { value: 'all', label: 'reply_settings_all' },
            { value: 'following', label: 'reply_settings_following' },
            { value: 'me', label: 'reply_settings_me' },
        ],
    },
    { key: 'timeline.hideQuote', category: 'timeline', scope: 'global', type: 'toggle', label: 'hide_quote', default: false },
    { key: 'timeline.simpleReply', category: 'timeline', scope: 'global', type: 'toggle', label: 'simple_reply', default: false },

    // --- general ---
    {
        key: 'general.userLanguage', category: 'general', scope: 'global', type: 'select',
        label: 'user_language_settings', optionsSource: 'userLanguages', default: '',
    },
    {
        key: 'general.language', category: 'general', scope: 'global', type: 'select',
        label: 'language_settings', default: 'en',
        options: [
            { value: 'ja', label: '日本語', literalLabel: true },
            { value: 'en', label: 'English', literalLabel: true },
            { value: 'ko', label: '한국어', literalLabel: true },
            { value: 'pt-BR', label: 'Português', literalLabel: true },
            { value: 'bg', label: 'български', literalLabel: true },
            { value: 'zh-CN', label: '简体中文', literalLabel: true },
            { value: 'ru', label: 'Русский', literalLabel: true },
            { value: 'fr', label: 'Français', literalLabel: true },
            { value: 'it', label: 'Italiano', literalLabel: true },
        ],
    },
    {
        key: 'general.translationModel', category: 'general', scope: 'global', type: 'radio',
        label: 'translation_model', default: 'nmt',
        options: [
            { value: 'nmt', label: 'translation_model_nmt' },
            { value: 'llm', label: 'translation_model_llm', icon: Sparkle },
        ],
    },
    { key: 'general.autoTranslate', category: 'general', scope: 'global', type: 'custom', custom: 'autoTranslate', label: 'auto_translation', isNew: true, default: false },
    { key: 'general.markedUnread', category: 'general', scope: 'global', type: 'toggle', label: 'store_column_feed_data', isNew: true, default: false },
    { key: 'embed.disableEmbedVia', category: 'general', scope: 'global', type: 'toggle', label: 'disable_embed_via', isNew: true, default: false },
    { key: 'general.dataSaver', category: 'general', scope: 'global', type: 'toggle', label: 'data_saver', description: 'data_saver_description', default: false },
    { key: 'general.disableTenorAutoplay', category: 'general', scope: 'global', type: 'toggle', label: 'disable_tenor_autoplay', default: false },
    { key: 'general.devMode', category: 'general', scope: 'global', type: 'toggle', label: 'dev_mode', default: false },
    { key: 'general.repostConfirmSkip', category: 'general', scope: 'global', type: 'toggle', label: 'skip_repost_confirm', default: false },
    { key: 'general.deleteConfirmSkip', category: 'general', scope: 'global', type: 'toggle', label: 'skip_delete_confirm', default: false },
    { key: 'general.linkWarningConfirmSkip', category: 'general', scope: 'global', type: 'toggle', label: 'skip_link_warning_confirm', default: false },
    { key: 'general.enableBluefeed', category: 'general', scope: 'global', type: 'toggle', label: 'enable_bluefeed', default: false },
    { key: 'general.disableAtmosphere', category: 'general', scope: 'global', type: 'toggle', label: 'disable_atmosphere', default: false },
    { key: 'general.disableMochiHoppe', category: 'general', scope: 'global', type: 'toggle', label: 'disable_mochi_hoppe', default: false },
    { key: 'general.useVirtual', category: 'general', scope: 'global', type: 'toggle', label: 'use_virtual', default: false },
    { key: 'general.finnhubApiKey', category: 'general', scope: 'global', type: 'custom', custom: 'finnhubApiKey', label: 'Finnhub API Key', literalLabel: true, default: '' },

    // --- design (complex pickers are custom; simple fields use generic Field types) ---
    { key: 'design.publishPosition', category: 'design', scope: 'global', type: 'custom', custom: 'publishPosition', label: 'publish_position', default: 'left' },
    { key: 'design.layout', category: 'design', scope: 'global', type: 'custom', custom: 'layout', label: 'layout', default: 'decks' },
    { key: 'design.bubbleTimeline', category: 'design', scope: 'global', type: 'custom', custom: 'bubbleTimeline', label: 'bubble_timeline', default: false },
    { key: 'design.skin', category: 'design', scope: 'global', type: 'custom', custom: 'skin', label: 'skin_theme', default: 'default' },
    { key: 'design.theme', category: 'design', scope: 'global', type: 'custom', custom: 'colorTheme', label: 'color_theme', default: 'defaut-10' },
    {
        key: 'design.fontTheme', category: 'design', scope: 'global', type: 'radio', appearance: 'radio',
        label: 'font_theme', default: 'default',
        options: [
            { value: 'default', label: 'Noto Sans', literalLabel: true },
            { value: 'zenmaru', label: 'Zen Maru Gothic', literalLabel: true },
            { value: 'murecho', label: 'Murecho', literalLabel: true },
        ],
    },
    {
        key: 'design.darkmode', category: 'design', scope: 'global', type: 'radio', appearance: 'radio',
        label: 'darkmode', default: false,
        options: [
            { value: false, label: 'light' },
            { value: true, label: 'dark' },
            { value: 'prefer', label: 'prefer' },
        ],
    },
    { key: 'design.fontSize', category: 'design', scope: 'global', type: 'range', label: 'posts_font_size', min: 1, max: 5, step: 1, default: 2 },
    { key: 'design.postsLayout', category: 'design', scope: 'global', type: 'custom', custom: 'postsLayout', label: 'posts_layout', default: 'compact' },
    { key: 'design.postsImageLayout', category: 'design', scope: 'global', type: 'custom', custom: 'postsImageLayout', label: 'posts_image_layout', default: 'default' },
    { key: 'design.galleryLayout', category: 'design', scope: 'global', type: 'custom', custom: 'galleryLayout', label: 'gallery_layout', default: 'carousel' },
    { key: 'design.externalLayout', category: 'design', scope: 'global', type: 'custom', custom: 'externalLayout', label: 'external_embed_layout', default: 'normal' },
    { key: 'design.oneImageNoCrop', category: 'design', scope: 'global', type: 'toggle', label: 'one_image_no_crop', default: false },
    { key: 'design.nonoto', category: 'design', scope: 'global', type: 'toggle', label: 'do_not_use_noto_sans', default: false },
    { key: 'design.displayHandle', category: 'design', scope: 'global', type: 'toggle', label: 'display_handle', default: true },
    {
        key: 'design.reactionMode', category: 'design', scope: 'global', type: 'radio', appearance: 'radio',
        label: 'reaction_mode', default: 'tokimeki',
        options: [
            { value: 'tokimeki', label: 'reaction_mode_tokimeki' },
            { value: 'superstar', label: 'reaction_mode_superstar' },
        ],
    },
    { key: 'design.absoluteTime', category: 'design', scope: 'global', type: 'toggle', label: 'use_absolute_time', default: false },
    {
        key: 'design.datetimeFormat', category: 'design', scope: 'global', type: 'select',
        label: 'datetime_format', default: 'yyyy-MM-dd HH:mm',
        options: [
            { value: 'yyyy-MM-dd HH:mm', label: '2023-10-15 11:32', literalLabel: true },
            { value: 'yy/MM/dd HH:mm', label: '23/10/15 11:32', literalLabel: true },
            { value: 'MM/dd/yy HH:mm', label: '10/15/23 11:32', literalLabel: true },
            { value: 'dd/MM/yy HH:mm', label: '15/10/23 11:32', literalLabel: true },
        ],
    },
    {
        key: 'design.mobilePostLayoutTop', category: 'design', scope: 'global', type: 'radio', appearance: 'radio',
        label: 'mobile_post_layout', default: false,
        options: [
            { value: false, label: 'mobile_post_layout_bottom' },
            { value: true, label: 'mobile_post_layout_top' },
        ],
    },
    { key: 'design.leftMode', category: 'design', scope: 'global', type: 'toggle', label: 'left_mode', platform: 'mobile', default: false },
    { key: 'design.disableProfilePopup', category: 'design', scope: 'global', type: 'toggle', label: 'disable_profile_popup', platform: 'pc', default: false },
    { key: 'design.mutualDisplay', category: 'design', scope: 'global', type: 'toggle', label: 'display_mutual_following', default: false },
    { key: 'design.mobileNewUi', category: 'design', scope: 'global', type: 'toggle', label: 'mobile_new_ui', platform: 'mobile', default: false },
    { key: 'design.monochrome', category: 'design', scope: 'global', type: 'toggle', label: 'monochrome', default: false },
] as const satisfies readonly SettingItem[];

// Literal-typed view (preserves key/option literals for search & type derivation).
export type SchemaKey = (typeof rawSettingsSchema)[number]['key'];

// Widened view for consumers that iterate/filter over the schema generically.
export const settingsSchema: readonly SettingItem[] = rawSettingsSchema;
