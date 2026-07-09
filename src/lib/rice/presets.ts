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

export const blueskyShellPreset = `# BLUESKY SHELL — 公式アプリ風のシングルカラムレイアウト
# style = single によりメインカラム1本のページ型レイアウトになります
# composer = top でメインカラム上部に投稿フォームを常設します
# フィードタブは layout の feedtabs 宣言により自動生成されます
# （手で消しても次回起動で復活。不要なら feedtabs 行を削除）
# mod+t（column.feedtabs）でいつでも手動再同期できます
# 文字数は公式同様のリングゲージ（length-ring）

$bg = #ffffff
$card = #f1f3f5
$border = #d4dbe2
$blue = #1083fe
$text = #0b1520
$text2 = #42576c
$text3 = #6a7f95

theme {
    reset = true
    tokens {
        current-theme-color = $blue
        app-bg-color = $bg
        app-color = $text
        base-bg-color = $bg
        bg-color-1 = $bg
        bg-color-2 = $card
        bg-color-3 = #e8ecf0
        blurred-bg-color = rgba(255, 255, 255, .9)
        menu-bg-color = $bg
        deck-heading-bubble-color = $card
        text-color-1 = $text
        text-color-2 = $text2
        text-color-3 = $text3
        border-color-1 = $border
        border-color-2 = #e3e8ee
        danger-color = #eb4d4d
        success-color = #2aa876
        follow-color = $blue
        link-color = $blue
        scroll-bar-color = #c5ced8
        side-nav-hover-bg-color = $card
        side-bg-color = $bg
        publish-textarea-bg-color = $card
        publish-border = 1px solid $border
        timeline-embed-border = 1px solid $border
        timeline-reaction-icon-color = $text3
        timeline-reaction-liked-icon-color = #ec4899
        timeline-reaction-reposted-icon-color = #20bc07
        box-shadow-color-1 = rgba(0, 0, 0, .08)
        decks-bg-color = $bg
        decks-gap = 0px
        decks-padding = 0px
        decks-margin = 0px
        deck-border-radius = 0px
        deck-border-color = $border
        deck-border-width = 1px
        deck-divider = 1px solid $border
        deck-tabs-height = 44px
        deck-tabs-bg-color = $bg
        deck-tabs-border-color = $border
        deck-tabs-color = $text3
        deck-tabs-active-color = $text
        deck-tabs-active-border-color = $blue
        single-m-width = 600px
        single-border = 1px solid $border
    }
}

bar "nav" {
    position = left
    style = menu
    width = 220px
    items = account, home, notifications, chat, columns, settings, spacer, publish
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

layout {
    align = center
    shell = centered
    style = single
    composer = top
    feedtabs = pinned
}

columnrule {
    match = all
    heading = hover
}

publish {
    length-ring = true
}

panel {
    position = auto
}

footer {
    items = workspace, search, notifications, chat, menu
    item "menu" {
        items = home, feeds, profile, settings
    }
}

bind {
    mod+t = column.feedtabs
}

media "desktop" {
    fab {
        show = false
    }
}

media "(max-width: 1279px)" {
    bar "widgets" {
        position = right
        enable = false
    }
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

plugin:aurora {
    enable = true
    intensity = 0.55
}

media "mobile" {
    theme {
        tokens {
            deck-border-radius = 0px
        }
    }
    columnrule {
        match = all
        reactions = spread
    }
    footer {
        items = workspace, notifications, chat, menu
        background = #0d1224
        border = 1px solid #1f2a55
        item "menu" {
            items = home, search, feeds, settings
        }
    }
    switcher {
        style = pill
        reveal = auto
        background = #0d1224
    }
}
`;

ricePresets['cyberdeck'] = cyberdeckPreset;

const macaronPreset = `# MACARON — pastel tiling rice
# Tile mode showcase. alt+m でスクロールデッキと切替。

$base = #1e1e2e
$mantle = #181825
$crust = #11111b
$surface = #313244
$mauve = #cba6f7
$pink = #f5c2e7

theme {
    reset = true
    tokens {
        current-theme-color = $mauve
        base-bg-color = $crust
        bg-color-1 = $base
        bg-color-2 = $surface
        bg-color-3 = $mantle
        blurred-bg-color = rgba(30, 30, 46, .85)
        menu-bg-color = $mantle
        deck-heading-bubble-color = $surface
        text-color-1 = #cdd6f4
        text-color-2 = #a6adc8
        text-color-3 = #6c7086
        border-color-1 = #45475a
        border-color-2 = $surface
        danger-color = #f38ba8
        success-color = #a6e3a1
        follow-color = $surface
        link-color = #89b4fa
        scroll-bar-color = #45475a
        side-nav-hover-bg-color = $surface
        publish-textarea-bg-color = $mantle
        publish-border = 1px solid $surface
        timeline-embed-border = 1px solid $surface
        timeline-reaction-icon-color = #6c7086
        timeline-reaction-liked-icon-color = $pink
        timeline-reaction-reposted-icon-color = #94e2d5
        box-shadow-color-1 = rgba(17, 17, 27, .5)
        decks-bg-color = $crust
        decks-gap = 10px
        decks-padding = 10px
        deck-border-radius = 16px
        deck-border-color = $surface
        deck-border-width = 1px
    }
}

layout {
    mode = tile
}

columnrule {
    match = all
    reactions = left 24px
    heading = hover
}

bar "dock" {
    position = left
    style = icons
    width = 64px
    background = $crust
    border = 1px solid #45475a
    items = home, notifications, chat, columns, spacer, settings
}

statusbar {
    position = top
    float = true
    height = 34px
    rounding = 17px
    margin = 10px
    background = $mantle
    border = 1px solid $surface
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
    dim = 0.35
    width = 340px
    background = $mantle
    rounding = 16px
    border = 1px solid $surface
}

focus {
    outline = 2px solid $mauve
    dim = 0.9
}

animation {
    bezier = soft, 0.22, 1, 0.36, 1
    panel = 260ms, soft, slide 20px, blur 6px
    menu = 150ms, soft, popin 96%
    modal = 200ms, soft, popin 97%
    drawer = 260ms, soft, slide left 48px, fade
    tooltip = 120ms, soft
    hover = 120ms, soft
    reorder = 220ms, soft
}

bind {
    alt+m = layout.mode
    alt+j = column.focus next
    alt+k = column.focus prev
    alt+n = publish.toggle
    alt+g = column.tabify
    alt+t = column.tab next
    mod+r = submap.enter resize
}

submap "resize" {
    h = column.width -50
    l = column.width +50
    j = column.move left
    k = column.move right
}

module "clock" {
    enable = true
}

media "mobile" {
    theme {
        tokens {
            deck-border-radius = 0px
            decks-gap = 0px
            decks-padding = 0px
        }
    }
    columnrule {
        match = all
        reactions = spread
        heading = show
    }
    footer {
        items = workspace, notifications, chat, menu
        background = $mantle
        border = 1px solid $surface
        item "menu" {
            items = home, search, feeds, settings
        }
    }
    switcher {
        style = pill
        reveal = auto
        background = $mantle
    }
}
`;

ricePresets['macaron'] = macaronPreset;

export function resolvePresetSource(ref: string): string | undefined {
    if (!ref.startsWith('preset:')) return undefined;
    return ricePresets[ref.slice('preset:'.length)];
}
