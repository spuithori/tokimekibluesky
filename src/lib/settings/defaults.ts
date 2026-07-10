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
export const CURRENT_VERSION = 12;

export const DEFAULT_RICE_CONFIG = `# TOKIMEKI Rice Framework
# https://docs.tokimeki.blue/rice

# $accent = #7a35f1

# theme {
#     reset = true
#     tokens {
#         deck-border-radius = 20px
#     }
# }

# columnrule {
#     match = all
#     reactions = left 28px
# }

# columnrule {
#     match = type:notification
#     opacity = 0.9
#     heading = hover
# }

# columnrule {
#     match = type:publish
#     heading = hidden
#     titlebar = hover
# }

# statusbar {
#     position = top
#     group "start" {
#         items = workspace
#     }
#     group "center" {
#         items = clock
#     }
#     group "end" {
#         items = notifications
#     }
#     item "clock" {
#         date = true
#     }
# }

# bar "left" {
#     position = left
#     style = menu
#     items = account, home, search, notifications, spacer, publish
#     width = 220px
# }

# 同じ左右エッジには別ラベルのバーを複数並べられます(宣言順=画面端から内側へ)。
# 同ラベルの再宣言は後勝ちで置換、enable = false は同ラベルのバーだけを撤去します。
# bar "dock" {
#     position = left
#     items = home, notifications, spacer, settings
# }

# bar "right" {
#     position = right
#     style = menu
#     width = 320px
#     items = search, trends, feeds, column#mini, calendar, text#hi, button#post, image#banner
#     item "search" {
#         placeholder = Search
#     }
#     item "column#mini" {
#         type = module:dummytimeline
#         height = 420px
#     }
#     item "text#hi" {
#         content = Stay comfy
#         align = center
#     }
#     item "button#post" {
#         label = New post
#         on-click = publish.toggle
#         appearance = primary
#     }
#     item "image#banner" {
#         src = https://example.com/banner.png
#         rounding = 12px
#     }
#     tab "Widgets" {
#         items = calendar, text#hi
#     }
# }

# layout {
#     mode = tile
# }

# bind {
#     alt+g = column.tabify
#     alt+t = column.tab next
#     alt+f = column.float
#     alt+s = scratchpad.toggle
#     mod+r = submap.enter resize
# }

# submap "resize" {
#     h = column.width -50
#     l = column.width +50
#     j = column.move left
#     k = column.move right
# }

# media "mobile" {
#     theme {
#         tokens {
#             deck-border-radius = 0px
#         }
#     }
# }

# footer {
#     items = workspace, search, notifications, menu
#     item "menu" {
#         items = home, feeds, settings
#     }
# }

# switcher {
#     style = pill
#     reveal = auto
# }

# fab {
#     position = left
#     size = 44px
# }

# media "prefers-color-scheme: dark" {
#     theme {
#         tokens {
#             primary-color = #9a6cff
#         }
#     }
# }

# module "search" {
#     enable = true
# }

# module "feeds" {
#     enable = true
# }

# source = preset:bluesky-shell
# source = preset:cyberdeck

# layout {
#     align = center
# }

# focus {
#     outline = 2px solid $accent
#     dim = 0.85
# }

# animation {
#     bezier = smooth, 0.2, 0, 0, 1
#     panel = 180ms, smooth
#     hover = off
# }

# source = preset:bluesky-menu

# module "clock" {
#     enable = true
#     seconds = true
#     date = true
# }
`;

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
            externalLayout: 'normal',
            reactionButtons: structuredClone(defaultReactionButtons),
            advancedBreak: false,
            mobilePostLayoutTop: false,
            displayHandle: true,
            reactionMode: 'tokimeki',
            leftMode: false,
            disableProfilePopup: false,
            singleWidth: 528,
            fixedFooter: false,
            mutualDisplay: false,
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
        rice: {
            enabled: true,
            config: DEFAULT_RICE_CONFIG,
            sources: {},
        },
        plugins: {
            installed: {},
            state: {},
        },
        version: CURRENT_VERSION,
    };
}
