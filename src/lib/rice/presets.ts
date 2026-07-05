export const ricePresets: Record<string, string> = {
    minimal: `theme {
    tokens {
        deck-border-radius = 12px
    }
}
`,
    cozy: `$gap = 12px

theme {
    tokens {
        deck-border-radius = 20px
        decks-gap = $gap
    }
}

columnrule {
    match = type:notification
    opacity = 0.92
}
`,
};

export const blueskyMenuPreset = `bar "left" {
    position = left
    style = menu
    items = account, home, search, notifications, chat, feeds, columns, profile, settings, spacer, publish
    width = 220px
}

statusbar {
    position = top
    modules = workspace, spacer, clock
}

panel {
    position = anchor
}

module "clock" {
    enable = true
}
`;

ricePresets['bluesky-menu'] = blueskyMenuPreset;

export const blueskyShellPreset = `bar "left" {
    position = left
    style = menu
    items = account, home, search, notifications, chat, columns, settings, spacer, publish
    width = 220px
}

bar "widgets" {
    position = right
    style = menu
    width = 320px
    items = search, trends, feeds
    item "search" {
        placeholder = Search
    }
}

statusbar {
    position = top
    group "start" {
        items = workspace
    }
    group "center" {
        items = clock
    }
    group "end" {
        items = notifications, chat
    }
}

panel {
    position = auto
}

module "search" {
    enable = true
}

module "feeds" {
    enable = true
}

module "clock" {
    enable = true
}
`;

ricePresets['bluesky-shell'] = blueskyShellPreset;

export const cyberdeckPreset = `# CYBERDECK — TOKIMEKI rice showcase
# Everything the Rice Framework can do, in one config.

$bg = #05070f
$panel = #0d1224
$line = #1f2a55
$neon = #00e5ff
$pink = #ff2ea6

theme {
    reset = true
    tokens {
        current-theme-color = $neon
        base-bg-color = $bg
        bg-color-1 = $panel
        bg-color-2 = #161d38
        bg-color-3 = #0f1530
        blurred-bg-color = $bg
        menu-bg-color = #0f1530
        deck-heading-bubble-color = #0f1530
        text-color-1 = #e6ecff
        text-color-2 = #8b96c9
        text-color-3 = #5f6a99
        border-color-1 = $line
        border-color-2 = #1a2348
        danger-color = $pink
        success-color = #00e5a5
        follow-color = #223060
        link-color = $neon
        scroll-bar-color = #223060
        side-nav-hover-bg-color = #161d38
        publish-textarea-bg-color = $panel
        publish-border = 1px solid #1a2348
        timeline-embed-border = 1px solid #1a2348
        timeline-reaction-icon-color = #3a4570
        timeline-reaction-liked-icon-color = $pink
        timeline-reaction-reposted-icon-color = #00e5a5
        box-shadow-color-1 = rgba(0, 0, 0, .55)
        decks-gap = 10px
        decks-padding = 8px
        deck-border-radius = 14px
        deck-border-color = $line
        deck-border-width = 1px
    }
}

columnrule {
    match = type:notification
    border = 1px solid $pink
}

columnrule {
    match = all
    reactions = left 28px
}

columnrule {
    match = type:publish
    heading = hidden
}

bar "dock" {
    position = left
    style = icons
    width = 64px
    background = #070b18
    border = 1px solid $line
    items = home, notifications, chat, columns, spacer, settings
}

bar "widgets" {
    position = right
    style = menu
    width = 320px
    background = #070b18
    border = 1px solid $line
    items = search, tabs, spacer, button#compose
    item "search" {
        placeholder = SEARCH //
    }
    item "button#compose" {
        label = NEW POST
        on-click = publish.toggle
        appearance = primary
    }
    tab "SYSTEM" {
        items = column#clock, calendar
        item "column#clock" {
            type = module:clock
            height = 200px
        }
    }
    tab "CONSOLE" {
        items = text#status
        item "text#status" {
            content = ▲ CYBERDECK ONLINE — stay comfy
            align = center
            size = 12px
            color = $pink
        }
    }
}

statusbar {
    position = top
    float = true
    height = 36px
    rounding = 18px
    margin = 10px
    background = $panel
    border = 1px solid $line
    font-size = 13px
    group "start" {
        items = workspace, keymode
    }
    group "center" {
        items = clock
    }
    group "end" {
        items = notifications, chat
    }
    item "clock" {
        date = true
    }
}

panel {
    position = auto
    dim = 0.4
    width = 340px
    background = $panel
    rounding = 18px
    border = 1px solid $line
}

layout {
    align = center
}

focus {
    outline = 2px solid $neon
    dim = 0.85
}

animation {
    bezier = cyber, 0.16, 1, 0.3, 1
    panel = 240ms, cyber, slide right 24px, blur 8px
    menu = 160ms, cyber, popin 96%
    modal = 220ms, cyber, popin 97%
    tooltip = 120ms, cyber
    hover = 120ms, cyber
    reorder = 240ms, cyber
}

bind {
    alt+j = column.focus next
    alt+k = column.focus prev
    alt+n = publish.toggle
    alt+g = column.tabify
    alt+t = column.tab next
    alt+f = column.float
    alt+s = scratchpad.toggle
    mod+r = submap.enter resize
}

submap "resize" {
    h = column.width -50
    l = column.width +50
    j = column.move left
    k = column.move right
    1 = column.width small
    2 = column.width large
}

module "clock" {
    enable = true
    seconds = true
}

module "search" {
    enable = true
}

module "aurora" {
    enable = true
    intensity = 0.55
}
`;

ricePresets['cyberdeck'] = cyberdeckPreset;

export function resolvePresetSource(ref: string): string | undefined {
    if (!ref.startsWith('preset:')) return undefined;
    return ricePresets[ref.slice('preset:'.length)];
}
