import type { reactionButtons } from '$lib/types/settings';

/**
 * Canonical settings value type. This is the single source of truth for the
 * shape of persisted global settings. The schema (schema.ts) is validated
 * against this type via PathValue, so a rename on either side is a compile error.
 *
 * Value unions are tightened incrementally: structurally exact here, with
 * obvious unions (darkmode, hide levels) typed now and the remaining `select`
 * value domains narrowed as each category is schematized in later phases.
 */

export type DarkMode = boolean | 'prefer';
export type RepostHideLevel = 'all' | 'many' | 'soso' | 'less' | 'none';
export type ReplyHideLevel = 'all' | 'following' | 'me';

export interface GeneralSettings {
    userLanguage: string;
    language: string;
    disableAlgorithm: boolean;
    repostConfirmSkip: boolean;
    deleteConfirmSkip: boolean;
    linkWarningConfirmSkip: boolean;
    hideWorkspaceButton: boolean;
    hideProfileCounts: boolean;
    enableBluefeed: boolean;
    disableHaptics: boolean;
    enableAppBrowser: boolean;
    disableChat: boolean;
    disableTenorAutoplay: boolean;
    disableAtmosphere: boolean;
    losslessImageUpload: boolean;
    requireInputAltText: boolean;
    useVirtual: boolean;
    continuousTag: boolean;
    disableMochiHoppe: boolean;
    dataSaver: boolean;
    // Unified from the legacy settingsState (folded in by the v3 -> v4 migration).
    translationModel: 'nmt' | 'llm';
    autoTranslate: boolean;
    markedUnread: boolean;
    // Formalised in Phase 1 (general page). `se` has no UI but is preserved.
    se: boolean;
    devMode: boolean;
    finnhubApiKey: string;
}

export interface DesignSettings {
    skin: string;
    theme: string;
    nonoto: boolean;
    fontTheme: string;
    darkmode: DarkMode;
    absoluteTime: boolean;
    layout: string;
    postsImageLayout: string;
    galleryLayout: string;
    postsLayout: string;
    externalLayout: string;
    reactionButtons: reactionButtons;
    advancedBreak: boolean;
    mobilePostLayoutTop: boolean;
    displayHandle: boolean;
    reactionMode: string;
    leftMode: boolean;
    disableProfilePopup: boolean;
    immersiveMode: boolean;
    singleWidth: string | number;
    fixedFooter: boolean;
    mutualDisplay: boolean;
    bubbleTimeline: boolean;
    threaded: boolean;
    monochrome: boolean;
    fontSize: number;
    // Formalised in Phase 2 (design page).
    datetimeFormat: string;
    oneImageNoCrop: boolean;
}

export interface TimelineSettings {
    hideRepost: RepostHideLevel;
    hideReply: ReplyHideLevel;
    hideMention: ReplyHideLevel;
    hideQuote: boolean;
    simpleReply: boolean;
}

/**
 * Label visibility action. The atproto visibility preferences are standardized
 * to these three; third-party labelers add new label *identifiers* (keys), not
 * new actions — so the value is typed while keys stay open.
 */
export type LabelPreference = 'hide' | 'warn' | 'ignore';

/**
 * Map of label identifier → action. Keys are intentionally open-ended: built-in
 * Bluesky labels, tokimeki aliases ('graphic-media', ...) and arbitrary
 * third-party labeler values all coexist here.
 */
export type ContentLabelPrefs = Record<string, LabelPreference>;

/** Per-labeler preferences — third-party labelers define their own label keys. */
export interface LabelerPreference {
    did: string;
    labels: ContentLabelPrefs;
}

export interface KeywordMute {
    enabled: boolean;
    word: string;
    period: { start: string; end: string };
    ignoreCaseSensitive: boolean;
    regExp: boolean;
}

export interface ModerationSettings {
    contentLabels: ContentLabelPrefs;
    labelers: LabelerPreference[];
    keywordMutes: KeywordMute[];
}

export interface EmbedSettings {
    x: boolean;
    youtube: boolean;
    spotify: boolean;
    bluemotion: boolean;
    giphy: boolean;
    tenor: boolean;
    klipy: boolean;
    // Unified from the legacy settingsState (folded in by the v3 -> v4 migration).
    disableEmbedVia: boolean;
}

export interface RiceSettings {
    enabled: boolean;
    config: string;
    sources: Record<string, string>;
}

export interface Settings {
    general: GeneralSettings;
    design: DesignSettings;
    timeline: TimelineSettings;
    moderation: ModerationSettings;
    embed: EmbedSettings;
    langFilter: string[];
    rice: RiceSettings;
    version: number;
}

/**
 * Dotted-path key union over Settings, e.g. 'general.repostConfirmSkip',
 * 'design.reactionButtons.shown'. Arrays are treated as leaves (not expanded).
 * Bounded recursion depth keeps the TS compiler happy on the 2-3 level tree.
 */
type Prev = [never, 0, 1, 2, 3, 4];

export type DottedKeys<T, D extends number = 4> = [D] extends [never]
    ? never
    : T extends readonly unknown[]
      ? never
      : T extends object
        ? {
              [K in keyof T & string]: NonNullable<T[K]> extends readonly unknown[]
                  ? K
                  : NonNullable<T[K]> extends object
                    ? K | `${K}.${DottedKeys<NonNullable<T[K]>, Prev[D]>}`
                    : K;
          }[keyof T & string]
        : never;

export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
    ? K extends keyof T
        ? PathValue<NonNullable<T[K]>, R>
        : never
    : P extends keyof T
      ? T[P]
      : never;

export type SettingsKey = DottedKeys<Settings>;
