export interface RiceDiagnostic {
    line: number;
    col: number;
    message: string;
    severity: 'error' | 'warning';
}

export interface EntryNode {
    kind: 'entry';
    key: string;
    value: string;
    line: number;
    valueStart: number;
    valueEnd: number;
}

export interface SectionNode {
    kind: 'section';
    name: string;
    label?: string;
    children: (EntryNode | SectionNode)[];
    startLine: number;
    endLine: number;
}

export interface VarStatement {
    kind: 'var';
    name: string;
    value: string;
    line: number;
}

export interface SetStatement {
    kind: 'set';
    path: string;
    value: string;
    line: number;
}

export interface SourceStatement {
    kind: 'source';
    ref: string;
    line: number;
}

export type TopStatement = VarStatement | SetStatement | SourceStatement | SectionNode;

export interface RiceDocument {
    statements: TopStatement[];
    diagnostics: RiceDiagnostic[];
}

export interface ColumnRuleMatch {
    type?: string;
    name?: string;
    did?: string;
    handle?: string;
}

export interface ColumnRule {
    match: ColumnRuleMatch;
    props: Record<string, string>;
}

export interface StatusbarConfig {
    position: 'top' | 'bottom';
    modules: string[];
    float: boolean;
    props: Record<string, string>;
}

export interface SidebarConfig {
    items: string[] | null;
    width?: string;
    showPublish: boolean;
    showAdd: boolean;
    showSettings: boolean;
}

export type BarPosition = 'top' | 'bottom' | 'left' | 'right';
export type BarSlot = BarPosition | 'footer' | 'drawer';
export type BarStyle = 'bar' | 'icons' | 'menu';
export type BarGroupName = 'start' | 'center' | 'end';

export interface BarItemSpec {
    id: string;
    base: string;
    options: Record<string, string>;
}

export interface BarGroup {
    name: BarGroupName;
    items: BarItemSpec[];
}

export interface BarTabSet {
    label: string;
    items: BarItemSpec[];
}

export interface BarConfig {
    kind: 'rice' | 'native';
    label?: string;
    position: BarSlot;
    style: BarStyle;
    items: string[] | null;
    itemSpecs: BarItemSpec[] | null;
    groups: BarGroup[] | null;
    tabSets: BarTabSet[] | null;
    float: boolean;
    props: Record<string, string>;
    showPublish: boolean;
    showAdd: boolean;
    showSettings: boolean;
}

export interface SwitcherConfig {
    style: 'strip' | 'pill';
    position: 'top' | 'bottom';
    reveal: 'always' | 'scroll' | 'auto';
    showAdd: boolean;
    props: Record<string, string>;
}

export interface FabConfig {
    show: boolean;
    position: 'left' | 'right';
    onClick?: string;
    props: Record<string, string>;
}

export interface PublishConfig {
    lengthRing: boolean;
}

export function emptyBar(position: BarSlot, kind: 'rice' | 'native'): BarConfig {
    return {
        kind,
        position,
        style: position === 'top' || position === 'bottom' ? 'bar' : 'icons',
        items: null,
        itemSpecs: null,
        groups: null,
        tabSets: null,
        float: false,
        props: {},
        showPublish: true,
        showAdd: true,
        showSettings: true,
    };
}

export interface RiceBind {
    combo: string;
    command: string;
}

export interface PanelConfig {
    position: 'auto' | 'anchor' | 'left' | 'right' | 'center';
    dim?: string;
    props: Record<string, string>;
}

export type LayoutStyle = 'deck' | 'single';

export interface LayoutConfig {
    align: 'left' | 'center' | 'right';
    mode?: 'scroll' | 'tile';
    shell?: 'none' | 'centered';
    shellWidth?: string;
    feedTabs?: 'pinned';
    style?: LayoutStyle;
    composer?: 'top';
}

export interface FocusConfig {
    outline?: string;
    outlineWidth?: string;
    dim?: string;
}

export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export type AnimationStyle =
    | { kind: 'slide'; direction?: SlideDirection; distance?: number }
    | { kind: 'fade' }
    | { kind: 'popin'; scale: number }
    | { kind: 'blur'; radius?: number };

export interface AnimationTargetConfig {
    duration: number;
    easing: string;
    easingFn?: string;
    bezier?: [number, number, number, number];
    styles?: AnimationStyle[];
}

export interface AnimationsConfig {
    enabled: boolean;
    targets: Record<string, AnimationTargetConfig>;
}

export const ANIMATION_TARGETS = ['panel', 'menu', 'modal', 'drawer', 'tooltip', 'reorder', 'hover'] as const;

export const STYLE_TARGETS = ['panel', 'menu', 'modal', 'drawer'] as const;

export const STYLE_KEYWORDS = ['slide', 'fade', 'popin', 'blur'] as const;

export const JS_EASING_KEYWORDS = ['bounce', 'elastic', 'back'] as const;

export interface CompiledRice {
    themeTokens: Record<string, string>;
    themeReset: boolean;
    columnRules: ColumnRule[];
    bars: Partial<Record<BarSlot, BarConfig[]>>;
    switcher: SwitcherConfig | null;
    fab: FabConfig | null;
    publish: PublishConfig | null;
    panel: PanelConfig | null;
    layout: LayoutConfig | null;
    focus: FocusConfig | null;
    animations: AnimationsConfig | null;
    binds: RiceBind[];
    submaps: Record<string, RiceBind[]>;
    modules: Record<string, { enable: boolean; options: Record<string, string> }>;
    plugins: Record<string, { enable: boolean; options: Record<string, string> }>;
    sets: { path: string; value: string }[];
    mediaQueries: string[];
    diagnostics: RiceDiagnostic[];
}

export function emptyCompiledRice(): CompiledRice {
    return {
        themeTokens: {},
        themeReset: false,
        columnRules: [],
        bars: {},
        switcher: null,
        fab: null,
        publish: null,
        panel: null,
        layout: null,
        focus: null,
        animations: null,
        binds: [],
        submaps: {},
        modules: {},
        plugins: {},
        sets: [],
        mediaQueries: [],
        diagnostics: [],
    };
}
