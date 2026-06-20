import type { Component } from 'svelte';

/**
 * Lazy registry for "custom" settings fields — complex UIs that don't fit the
 * generic field types (dynamic descriptions, side-effecting onchange, bespoke
 * markup, SVG thumbnails, liveQuery, ...). Entries are dynamic imports so each
 * component is code-split and loaded only when its category page renders it.
 * `satisfies` keeps CustomFieldId a precise literal union for schema.ts checking.
 */
export const customFields = {
    // general
    autoTranslate: () => import('$lib/components/settings/fields/custom/AutoTranslateField.svelte'),
    finnhubApiKey: () => import('$lib/components/settings/fields/custom/FinnhubApiKeyField.svelte'),
    // design
    publishPosition: () => import('$lib/components/settings/fields/custom/PublishPositionField.svelte'),
    layout: () => import('$lib/components/settings/fields/custom/LayoutField.svelte'),
    bubbleTimeline: () => import('$lib/components/settings/fields/custom/BubbleTimelineField.svelte'),
    skin: () => import('$lib/components/settings/fields/custom/SkinField.svelte'),
    colorTheme: () => import('$lib/components/settings/fields/custom/ColorThemeField.svelte'),
    postsLayout: () => import('$lib/components/settings/fields/custom/PostsLayoutField.svelte'),
    postsImageLayout: () => import('$lib/components/settings/fields/custom/PostsImageLayoutField.svelte'),
    galleryLayout: () => import('$lib/components/settings/fields/custom/GalleryLayoutField.svelte'),
    externalLayout: () => import('$lib/components/settings/fields/custom/ExternalLayoutField.svelte'),
} satisfies Record<string, () => Promise<{ default: Component<any> }>>;

export type CustomFieldId = keyof typeof customFields;
