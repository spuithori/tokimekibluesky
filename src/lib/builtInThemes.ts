import type {Theme} from "$lib/types/theme";

export const builtInThemes: Theme[] = [
    {
        id: 'default',
        createdAt: '2025-03-26 04:42:22.128197+00',
        updatedAt: '2025-03-26 04:42:22.128197+00',
        name: 'default',
        description: 'Brand New Story',
        style: '--bg-color-1:#fff;--bg-color-2:#f2f4f5;--bg-color-3:#f8f9fb;--blurred-bg-color:transparent;--border-color-1:#dfe2e6;--border-color-2:#e2e7ea;--text-color-1:#000;--text-color-2:#6f706f;--text-color-3:#6f706f;--link-color:var(--primary-color);--deck-border-color:var(--border-color-2);--nav-content-border-width:1px;--nav-content-border-color:transparent;--deck-heading-icon-color:var(--primary-color);--bar-primary-icon-color:var(--primary-color);--bar-secondary-icon-color:var(--text-color-1);--nav-secondary-icon-color:var(--text-color-1);--bar-bottom-icon-color:var(--text-color-1);--nav-primary-icon-color:var(--primary-color);--menu-bg-color:var(--bg-color-3);--text-color-primary-colored:var(--primary-color);--success-color:#a3be8c;--danger-color:#e62552;--follow-color:#d8dee9;--decks-gap:0;--deck-border-radius:0;--decks-padding:0;--decks-margin:0px;--deck-divider-width:404px;--side-padding-right:0;--nav-content-border-radius:8px 0 0 8px;--deck-border-width:0;--nav-content-bg-color:hsla(0,0%,100%,.5);--publish-textarea-bg-color:var(--bg-color-1);--deck-border-right:1px solid var(--border-color-2);--decks-flex:1;--decks-border-radius:8px 8px 0 0;--decks-bg-color:hsla(0,0%,100%,.5);--scroll-bar-color:var(--border-color-1);--timeline-reaction-icon-color:#dadadb;--timeline-reaction-liked-icon-color:#ea679b;--timeline-reaction-reposted-icon-color:#64c591;--side-nav-hover-bg-color:hsla(0,0%,100%,.5);--publish-border:1px solid var(--border-color-2);--publish-tool-button-color:#6f706f;--decks-border-left:1px solid var(--border-color-2);--timeline-embed-border:1px solid var(--border-color-2);--decks-height:calc(100dvh - var(--decks-margin, 0px));--decks-border:1px solid var(--border-color-2);--decks-border-bottom:none;--decks-box-shadow:0 2px 8px #0000000a;--decks-margin-bottom:0;',
        options: {
            colorDisabled: false,
            darkmodeDisabled: false,
            thumbnail: '/skin-default.png',
            cover: '/skin-default.png',
            colors: [
                {
                    id: 'defaut-1',
                    code: '--current-theme-color:#f182ac;--primary-color:var(--current-theme-color);--base-bg-color:#f6e9ef;--base-dark-bg-color:#321a24;--deck-heading-bubble-color:#f8f5f8;',
                    name: 'lightpink',
                    colorCode: '#f182ac',
                },
                {
                    id: 'defaut-2',
                    code: '--current-theme-color:#bfae20;--primary-color:var(--current-theme-color);--base-bg-color:#efead8;--base-dark-bg-color:#201d08;--deck-heading-bubble-color:#f5f5ed;',
                    name: 'pastelyellow',
                    colorCode: '#bfae20',
                },
                {
                    id: 'defaut-3',
                    code: '--current-theme-color:#27c7cc;--primary-color:var(--current-theme-color);--base-bg-color:#e0f1f1;--base-dark-bg-color:#082425;--deck-heading-bubble-color:#f1f8f9;',
                    name: 'lightblue',
                    colorCode: '#27c7cc',
                },
                {
                    id: 'defaut-4',
                    code: '--current-theme-color:#4c81fb;--primary-color:var(--current-theme-color);--base-bg-color:#e0e5ef;--base-dark-bg-color:#0e1a33;--deck-heading-bubble-color:#eff2f8;',
                    name: 'royalblue',
                    colorCode: '#4c81fb',
                },
                {
                    id: 'defaut-5',
                    code: '--current-theme-color:#ed7331;--primary-color:var(--current-theme-color);--base-bg-color:#f4e9e1;--base-dark-bg-color:#2b1207;--deck-heading-bubble-color:#f7f4f1;',
                    name: 'superorange',
                    colorCode: '#ed7331',
                },
                {
                    id: 'defaut-6',
                    code: '--current-theme-color:#7a35f1;--primary-color:var(--current-theme-color);--base-bg-color:#ece8f3;--base-dark-bg-color:#1f152e;--deck-heading-bubble-color:#f4f4fa;',
                    name: 'violet',
                    colorCode: '#7a35f1',
                },
                {
                    id: 'defaut-7',
                    code: '--current-theme-color:#f13551;--primary-color:var(--current-theme-color);--base-bg-color:#f3e6e8;--base-dark-bg-color:#300a12;--deck-heading-bubble-color:#f7f3f4;',
                    name: 'scarlet',
                    colorCode: '#f13551',
                },
                {
                    id: 'defaut-8',
                    code: '--current-theme-color:#8bb556;--primary-color:var(--current-theme-color);--base-bg-color:#e2e8db;--base-dark-bg-color:#19220f;--deck-heading-bubble-color:#f0f4ee;',
                    name: 'lightgreen',
                    colorCode: '#8bb556',
                },
                {
                    id: 'defaut-9',
                    code: '--current-theme-color:#1b1b1b;--primary-color:var(--current-theme-color);--base-bg-color:#f3f3f3;--base-dark-bg-color:#100f0f;--link-color:#4c81fb;--dark-primary-color:var(--text-color-2);--deck-heading-bubble-color:#f8f9fa;',
                    name: 'paperwhite',
                    colorCode: '#ffffff',
                },
                {
                    id: 'defaut-10',
                    code: '--current-theme-color:#22bd77;--primary-color:var(--current-theme-color);--base-bg-color:#e6f4ed;--base-dark-bg-color:#082216;--deck-heading-bubble-color:#f3f9f7;',
                    name: 'jade',
                    colorCode: '#22bd77',
                },
                {
                    id: 'defaut-11',
                    code: '--current-theme-color:#45484e;--primary-color:var(--current-theme-color);--base-bg-color:#dbdde4;--base-dark-bg-color:#1b1c1e;--link-color:#4c81fb;--dark-primary-color:var(--text-color-2);--deck-heading-bubble-color:#eceef2;',
                    name: 'platinumsilver',
                    colorCode: '#eeeeee',
                },
                {
                    id: 'defaut-12',
                    code: '--current-theme-color:#e3978c;--primary-color:var(--current-theme-color);--base-bg-color:#f1dfdd;--base-dark-bg-color:#30221d;--deck-heading-bubble-color:#f5f0ef;',
                    name: 'pinkgold',
                    colorCode: '#e3978c',
                },
            ],
            bubbleStyle: '--deck-content-bg-color:transparent;--scroll-bar-bg-color:transparent;--deck-border-right:none;--deck-border-color:transparent;--timeline-padding:0 8px;--bubble-marin:0 0 16px;--notification-filter-border:none;--notifications-new-right:12px;--notifications-new-top:12px;--notification-filter-bg-color:var(--bg-color-1);--notification-filter-margin:0 8px 16px;--notification-filter-border-radius:var(--border-radius-4);--scroll-bar-border-radius:3px;--deck-heading-icon-bg-color:transparent;--decks-gap:12px;--decks-padding-left:8px;--deck-heading-bg-color:var(--deck-heading-bubble-color,transparent);--timeline-bg-color:var(--deck-heading-bubble-color,transparent);--bubble-bg-color:#fff;--publish-textarea-bg-color:#fff;--single-bg-color:var(--deck-heading-bubble-color,transparent);--single-border:none;--modal-page-bg-color:var(--deck-heading-bubble-color);',
            darkmodeStyle: '--primary-color:var(--dark-primary-color,var(--current-theme-color));--app-bg-color:var(--base-dark-bg-color);--base-bg-color:#1b1a19;--bg-color-1:#1d1e20;--bg-color-2:#272727;--bg-color-3:#1e1e1e;--border-color-1:#403d3d;--border-color-2:#3c3c3c;--text-color-1:#dee0e3;--text-color-2:#bababa;--text-color-3:#8f8f8f;--timeline-embed-box-shadow:0 0 0 1px var(--border-color-1) inset;--timeline-embed-bg-color:var(--base-bg-color);--timeline-embed-border:none;--decks-bg-color:rgba(0,0,0,.25);--nav-content-bg-color:rgba(0,0,0,.25);--side-nav-hover-bg-color:rgba(0,0,0,.25);--publish-textarea-bg-color:rgba(0,0,0,.25);--publish-tool-button-color:var(--text-color-1);--deck-heading-bubble-color:transparent;--deck-heading-backdrop-filter:blur(20px);--bubble-bg-color:rgba(0,0,0,.25);--notification-filter-bg-color:rgba(0,0,0,.25);--modal-page-bg-color:var(--bg-color-1);--timeline-reaction-icon-color:var(--border-color-1);'
        },
        author: 'TOKIMEKI',
        keyword: 'builtin',
        version: '2.0',
        isBuiltIn: true,
    },
];

export function oldThemeConvert(currentTheme: string) {
    try {
        const oldIds = ['lightpink', 'pastelyellow', 'lightblue', 'royalblue', 'superorange', 'violet', 'scarlet', 'lightgreen', 'paperwhite', 'jade', 'platinumsilver', 'pinkgold'];

        if (oldIds.includes(currentTheme)) {
            return `defaut-${oldIds.indexOf(currentTheme) + 1}`;
        }

        return null;
    } catch (e) {
        console.error(e);
    }
}