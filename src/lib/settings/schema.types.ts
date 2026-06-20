import type { Settings, SettingsKey, PathValue } from './types';
import type { CustomFieldId } from './customRegistry';

/**
 * Metadata model for a single setting. The schema (schema.ts) is an array of
 * these, written `as const satisfies readonly SettingItem[]` so option/key
 * literals are preserved while `key` is checked against the canonical Settings
 * type. Complex values escape via `type: 'custom'` + a customRegistry id.
 */

export type SettingsCategoryId = 'general' | 'design' | 'timeline' | 'embed' | 'moderation';

export type SettingType = 'toggle' | 'select' | 'radio' | 'range' | 'text' | 'password' | 'custom';

export type RadioAppearance = 'radio' | 'boxed' | 'icon' | 'layout';

export type SettingScope = 'global' | 'account';

/** Runtime context passed to visible/disabled predicates. */
export interface SettingsContext {
    localTranslateSupported: boolean;
}

export interface SettingOption {
    value: string | number | boolean;
    /** i18n key, or a literal string when `literalLabel` is true. */
    label: string;
    literalLabel?: boolean;
    // lucide-svelte icon component. Typed `any` because lucide's component type
    // does not align with Svelte 5's `Component` signature.
    icon?: any;
}

export interface SettingItem<K extends SettingsKey = SettingsKey> {
    key: K;
    category: SettingsCategoryId;
    scope: SettingScope;
    type: SettingType;
    /** i18n key for the field label (or literal when `literalLabel` is true). */
    label: string;
    literalLabel?: boolean;
    /** i18n key for the description; explicit (never auto-derived). */
    description?: string;
    default: PathValue<Settings, K>;

    // select / radio
    options?: readonly SettingOption[];
    optionsSource?: 'languages' | 'userLanguages' | 'datetimeFormats';
    appearance?: RadioAppearance;
    fullwidth?: boolean;

    // range
    min?: number;
    max?: number;
    step?: number;

    // custom escape hatch
    custom?: CustomFieldId;

    // presentation / conditions
    isNew?: boolean;
    platform?: 'mobile' | 'pc';
    visible?: (ctx: SettingsContext) => boolean;
    disabled?: (ctx: SettingsContext) => boolean;
    /** Extra i18n keys / literals to widen search matching. */
    searchKeywords?: readonly string[];
}
