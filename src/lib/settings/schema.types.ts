import type { Settings, SettingsKey, PathValue } from "./types";
import type { CustomFieldId } from "./customRegistry";

export type SettingsCategoryId =
    | "general"
    | "design"
    | "timeline"
    | "embed"
    | "moderation";

export type SettingType =
    | "toggle"
    | "select"
    | "radio"
    | "range"
    | "text"
    | "password"
    | "custom";

export type RadioAppearance = "radio" | "boxed" | "icon" | "layout";

export type SettingScope = "global" | "account";

export interface SettingsContext {
    localTranslateSupported: boolean;
}

export interface SettingOption {
    value: string | number | boolean;
    label: string;
    literalLabel?: boolean;
    icon?: any;
}

export interface SettingItem<K extends SettingsKey = SettingsKey> {
    key: K;
    category: SettingsCategoryId;
    scope: SettingScope;
    type: SettingType;
    label: string;
    literalLabel?: boolean;
    description?: string;
    section?: string;
    default: PathValue<Settings, K>;

    // select / radio
    options?: readonly SettingOption[];
    optionsSource?: "languages" | "userLanguages" | "datetimeFormats";
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
    platform?: "mobile" | "pc";
    visible?: (ctx: SettingsContext) => boolean;
    disabled?: (ctx: SettingsContext) => boolean;
    searchKeywords?: readonly string[];
}
