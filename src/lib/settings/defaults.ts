import type { Settings, LabelerPreference } from './types';
import { defaultReactionButtons } from '$lib/defaultSettings';
import { isSafariOrFirefox } from '$lib/util';

export const DEFAULT_LABELER_SETTINGS: LabelerPreference[] = [
    {
        did: 'did:plc:ar7c4by46qjdydhdevvrndac',
        labels: {
            spam: 'hide',
            impersonation: 'hide',
            scam: 'hide',
            intolerant: 'warn',
            'self-harm': 'warn',
            security: 'hide',
            misleading: 'warn',
            threat: 'hide',
            'unsafe-link': 'hide',
            illicit: 'hide',
            misinformation: 'warn',
            rumor: 'warn',
            rude: 'hide',
            extremist: 'hide',
            sensitive: 'warn',
            'engagement-farming': 'hide',
            inauthentic: 'hide',
            'sexual-figurative': 'warn',
        },
    },
];

/**
 * Current settings schema version. Migrations (migrations.ts) bring older
 * stored payloads up to this version before deep-merging against the defaults.
 */
export const CURRENT_VERSION = 6;

function detectLanguage(): string {
    return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
}

function detectNonoto(): boolean {
    return typeof navigator !== 'undefined' ? isSafariOrFirefox() : false;
}

/**
 * Fresh default settings for a brand-new user. Browser-dependent values
 * (language, nonoto) fall back to safe values when navigator is absent so this
 * stays usable from pure migration unit tests.
 */
export function createDefaultSettings(): Settings {
    const language = detectLanguage();

    return {
        general: {
            userLanguage: language,
            language,
            disableAlgorithm: false,
            repostConfirmSkip: false,
            deleteConfirmSkip: false,
            linkWarningConfirmSkip: false,
            hideWorkspaceButton: false,
            hideProfileCounts: false,
            enableBluefeed: false,
            disableHaptics: false,
            enableAppBrowser: false,
            disableChat: false,
            disableTenorAutoplay: false,
            disableAtmosphere: false,
            losslessImageUpload: false,
            requireInputAltText: false,
            useVirtual: false,
            continuousTag: false,
            disableMochiHoppe: false,
            dataSaver: false,
            translationModel: 'nmt',
            autoTranslate: false,
            markedUnread: false,
            se: false,
            devMode: false,
            finnhubApiKey: '',
        },
        design: {
            skin: 'default',
            theme: 'defaut-10',
            nonoto: detectNonoto(),
            fontTheme: 'default',
            darkmode: false,
            absoluteTime: false,
            layout: 'decks',
            postsImageLayout: 'default',
            galleryLayout: 'carousel',
            postsLayout: 'compact',
            publishPosition: 'left',
            externalLayout: 'normal',
            reactionButtons: structuredClone(defaultReactionButtons),
            advancedBreak: false,
            mobilePostLayoutTop: false,
            displayHandle: true,
            reactionMode: 'tokimeki',
            leftMode: false,
            disableProfilePopup: false,
            immersiveMode: false,
            singleWidth: 'medium',
            fixedFooter: false,
            mutualDisplay: false,
            mobileNewUi: false,
            bubbleTimeline: false,
            threaded: false,
            monochrome: false,
            fontSize: 2,
            datetimeFormat: 'yyyy-MM-dd HH:mm',
            oneImageNoCrop: false,
        },
        timeline: {
            hideRepost: 'all',
            hideReply: 'all',
            hideMention: 'all',
            hideQuote: false,
            simpleReply: false,
        },
        moderation: {
            contentLabels: {
                gore: 'warn',
                nsfw: 'warn',
                nudity: 'warn',
                suggestive: 'warn',
                porn: 'warn',
                sexual: 'warn',
            },
            labelers: structuredClone(DEFAULT_LABELER_SETTINGS),
            keywordMutes: [],
        },
        embed: {
            x: true,
            youtube: true,
            spotify: false,
            bluemotion: true,
            giphy: true,
            tenor: true,
            klipy: true,
            disableEmbedVia: false,
        },
        langFilter: [],
        version: CURRENT_VERSION,
    };
}
